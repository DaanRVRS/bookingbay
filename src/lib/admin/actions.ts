"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, ACTIVE_ORG_COOKIE } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/auth/schemas";
import { audit } from "@/lib/audit/log";
import {
  IMPERSONATE_COOKIE,
  buildImpersonationCookieValue,
} from "@/lib/admin/impersonate";
import { onPaidUntilChanged } from "@/lib/billing/lifecycle";

const PLAN = z.enum(["STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"]);

const PLAN_MODE = z.enum(["keep", "trial", "paid"]);

export async function setOrgPlanAction(
  organizationId: string,
  plan: z.infer<typeof PLAN>,
  mode: z.infer<typeof PLAN_MODE> = "keep",
  days: number = 30,
): Promise<ActionResult> {
  const me = await requireAdmin();
  const parsed = PLAN.safeParse(plan);
  if (!parsed.success) return { ok: false, error: "Ongeldig plan" };
  const parsedMode = PLAN_MODE.safeParse(mode);
  if (!parsedMode.success) return { ok: false, error: "Ongeldige modus" };
  if (!Number.isInteger(days) || days < 1 || days > 1830) {
    return { ok: false, error: "Aantal dagen moet 1-1830 zijn" };
  }

  const existing = await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      plan: true,
      name: true,
      trialEndsAt: true,
      paidUntil: true,
    },
  });
  if (!existing) return { ok: false, error: "Organisatie niet gevonden" };

  const data: {
    plan: z.infer<typeof PLAN>;
    trialEndsAt?: Date | null;
    paidUntil?: Date | null;
    suspendedAt?: Date | null;
    paymentReminderStage?: number;
    trialReminderStage?: number;
  } = { plan: parsed.data };

  if (parsedMode.data === "trial") {
    const next = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    data.trialEndsAt = next;
    data.paidUntil = null;
    data.suspendedAt = null;
    data.paymentReminderStage = 0;
    data.trialReminderStage = 0;
  } else if (parsedMode.data === "paid") {
    const next = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    data.trialEndsAt = null;
    data.paidUntil = next;
    data.suspendedAt = null;
    data.paymentReminderStage = 0;
    data.trialReminderStage = 0;
  }

  await db.organization.update({
    where: { id: organizationId },
    data,
  });

  await audit({
    organizationId,
    actorUserId: me.id,
    action: "org.plan.change",
    resource: "organization",
    resourceId: organizationId,
    metadata: {
      from: existing.plan,
      to: parsed.data,
      mode: parsedMode.data,
      days: parsedMode.data === "keep" ? null : days,
      byAdmin: true,
    },
  });

  revalidatePath("/admin/organizations");
  revalidatePath(`/admin/organizations/${organizationId}`);
  return { ok: true };
}

export async function extendTrialAction(
  organizationId: string,
  days: number,
): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    return { ok: false, error: "Aantal dagen moet 1-365 zijn" };
  }

  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { trialEndsAt: true },
  });
  if (!org) return { ok: false, error: "Niet gevonden" };

  const base = org.trialEndsAt && org.trialEndsAt > new Date() ? org.trialEndsAt : new Date();
  const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

  await db.organization.update({
    where: { id: organizationId },
    data: { trialEndsAt: next },
  });

  await audit({
    organizationId,
    actorUserId: me.id,
    action: "org.trial.extend",
    resource: "organization",
    resourceId: organizationId,
    metadata: { byAdmin: true, days, newEndsAt: next.toISOString() },
  });

  revalidatePath(`/admin/organizations/${organizationId}`);
  return { ok: true };
}

/**
 * Set or extend the paidUntil date on an org. Used by admins after a
 * payment is received (manual workflow until Mollie is integrated).
 * Days = number of days to extend from the existing paidUntil (or now).
 */
export async function setOrgPaidUntilAction(
  organizationId: string,
  days: number,
): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!Number.isInteger(days) || days < 1 || days > 366 * 5) {
    return { ok: false, error: "Aantal dagen moet 1-1830 zijn" };
  }

  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { paidUntil: true },
  });
  if (!org) return { ok: false, error: "Niet gevonden" };

  const base =
    org.paidUntil && org.paidUntil > new Date() ? org.paidUntil : new Date();
  const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

  await db.organization.update({
    where: { id: organizationId },
    data: { paidUntil: next },
  });
  await onPaidUntilChanged(organizationId);

  await audit({
    organizationId,
    actorUserId: me.id,
    action: "org.payment.extend",
    resource: "organization",
    resourceId: organizationId,
    metadata: { byAdmin: true, days, paidUntil: next.toISOString() },
  });

  revalidatePath(`/admin/organizations/${organizationId}`);
  return { ok: true };
}

export async function clearOrgSuspensionAction(
  organizationId: string,
): Promise<ActionResult> {
  const me = await requireAdmin();
  await db.organization.update({
    where: { id: organizationId },
    data: { suspendedAt: null, paymentReminderStage: 0 },
  });
  await audit({
    organizationId,
    actorUserId: me.id,
    action: "org.subscription.unsuspend",
    resource: "organization",
    resourceId: organizationId,
    metadata: { byAdmin: true },
  });
  revalidatePath(`/admin/organizations/${organizationId}`);
  return { ok: true };
}

export async function setUserAdminAction(
  userId: string,
  isAdmin: boolean,
): Promise<ActionResult> {
  const me = await requireAdmin();
  if (me.id === userId && !isAdmin) {
    return { ok: false, error: "Kan jezelf niet de-promoten" };
  }
  await db.user.update({ where: { id: userId }, data: { isAdmin } });

  await audit({
    actorUserId: me.id,
    action: isAdmin ? "user.admin.grant" : "user.admin.revoke",
    resource: "user",
    resourceId: userId,
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

const updateOrgFromAdminSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/),
});

export async function adminUpdateOrgAction(input: {
  organizationId: string;
  name: string;
  slug: string;
}): Promise<ActionResult> {
  const me = await requireAdmin();
  const parsed = updateOrgFromAdminSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ongeldige invoer" };

  const existing = await db.organization.findUnique({
    where: { id: parsed.data.organizationId },
    select: { id: true, name: true, slug: true },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };

  if (parsed.data.slug !== existing.slug) {
    const conflict = await db.organization.findUnique({
      where: { slug: parsed.data.slug },
      select: { id: true },
    });
    if (conflict) return { ok: false, error: "Slug al in gebruik" };
  }

  await db.organization.update({
    where: { id: parsed.data.organizationId },
    data: { name: parsed.data.name, slug: parsed.data.slug },
  });

  await audit({
    organizationId: parsed.data.organizationId,
    actorUserId: me.id,
    action: "org.update",
    resource: "organization",
    resourceId: parsed.data.organizationId,
    metadata: {
      byAdmin: true,
      from: { name: existing.name, slug: existing.slug },
      to: { name: parsed.data.name, slug: parsed.data.slug },
    },
  });

  revalidatePath(`/admin/organizations/${parsed.data.organizationId}`);
  return { ok: true };
}

export async function adminDeleteOrgAction(organizationId: string): Promise<ActionResult> {
  const me = await requireAdmin();
  const existing = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };

  await db.organization.delete({ where: { id: organizationId } });

  await audit({
    actorUserId: me.id,
    action: "org.delete",
    resource: "organization",
    resourceId: organizationId,
    metadata: { byAdmin: true, name: existing.name },
  });

  revalidatePath("/admin/organizations");
  return { ok: true };
}

export async function adminVerifyEmailAction(userId: string): Promise<ActionResult> {
  const me = await requireAdmin();
  await db.user.update({
    where: { id: userId },
    data: { emailVerified: new Date() },
  });
  await audit({
    actorUserId: me.id,
    action: "user.verify",
    resource: "user",
    resourceId: userId,
  });
  revalidatePath("/admin/users");
  return { ok: true };
}

const isProd = process.env.NODE_ENV === "production";
const cookieSecure = isProd && (process.env.NEXTAUTH_URL ?? "").startsWith("https");

export async function startImpersonationAction(targetUserId: string): Promise<ActionResult> {
  const me = await requireAdmin();
  if (me.id === targetUserId) {
    return { ok: false, error: "Je bent al jezelf" };
  }

  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, name: true },
  });
  if (!target) return { ok: false, error: "Gebruiker niet gevonden" };

  const jar = await cookies();
  jar.set(IMPERSONATE_COOKIE, buildImpersonationCookieValue(me.id, target.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure,
    path: "/",
    maxAge: 60 * 60, // 1 hour
  });

  // Reset the active-org cookie so requireOrg picks the target's first org.
  jar.delete(ACTIVE_ORG_COOKIE);

  await audit({
    actorUserId: me.id,
    action: "admin.impersonate.start",
    resource: "user",
    resourceId: target.id,
    metadata: { targetEmail: target.email },
  });

  return { ok: true };
}

export async function stopImpersonationAction(): Promise<ActionResult> {
  const jar = await cookies();
  const raw = jar.get(IMPERSONATE_COOKIE)?.value;
  jar.delete(IMPERSONATE_COOKIE);
  jar.delete(ACTIVE_ORG_COOKIE);

  if (raw) {
    const [realUserId, targetUserId] = raw.split(":");
    if (realUserId && targetUserId) {
      await audit({
        actorUserId: realUserId,
        action: "admin.impersonate.stop",
        resource: "user",
        resourceId: targetUserId,
      });
    }
  }

  return { ok: true };
}
