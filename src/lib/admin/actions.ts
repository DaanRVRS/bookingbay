"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/auth/schemas";

const PLAN = z.enum(["STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"]);

export async function setOrgPlanAction(
  organizationId: string,
  plan: z.infer<typeof PLAN>,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = PLAN.safeParse(plan);
  if (!parsed.success) return { ok: false, error: "Ongeldig plan" };

  const exists = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true },
  });
  if (!exists) return { ok: false, error: "Organisatie niet gevonden" };

  await db.organization.update({
    where: { id: organizationId },
    data: { plan: parsed.data },
  });

  revalidatePath("/admin/organizations");
  revalidatePath(`/admin/organizations/${organizationId}`);
  return { ok: true };
}

export async function extendTrialAction(
  organizationId: string,
  days: number,
): Promise<ActionResult> {
  await requireAdmin();
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
  revalidatePath("/admin/users");
  return { ok: true };
}
