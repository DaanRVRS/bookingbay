"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { rm } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOrg, requireUser } from "@/lib/auth/session";
import { assertCan } from "@/lib/auth/permissions";
import {
  updateProfileSchema,
  changePasswordSchema,
  updateOrgSchema,
  deleteOrgSchema,
  deleteAccountSchema,
  emailPreferencesSchema,
  type UpdateProfileInput,
  type ChangePasswordInput,
  type UpdateOrgInput,
  type DeleteOrgInput,
  type DeleteAccountInput,
  type EmailPreferencesInput,
} from "./schemas";
import type { ActionResult } from "@/lib/auth/schemas";
import { audit } from "@/lib/audit/log";
import { blockDemoWrite } from "@/lib/demo/guard";

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const path = i.path.join(".");
    if (!out[path]) out[path] = i.message;
  }
  return out;
}

const RESERVED_SLUGS = new Set([
  "app", "api", "www", "admin", "dashboard", "login", "register",
  "auth", "static", "assets", "public", "support", "help", "docs",
  "blog", "mail", "billing", "uploads", "site", "embed", "invite",
]);

export async function updateProfileAction(input: UpdateProfileInput): Promise<ActionResult> {
  const user = await requireUser();
  const blocked = blockDemoWrite(user);
  if (blocked) return blocked;
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }
  await db.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name },
  });
  revalidatePath("/dashboard/settings/profile");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function changePasswordAction(input: ChangePasswordInput): Promise<ActionResult> {
  const user = await requireUser();
  const blocked = blockDemoWrite(user);
  if (blocked) return blocked;
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }

  const fresh = await db.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!fresh?.passwordHash) {
    return { ok: false, error: "Geen wachtwoord ingesteld op dit account" };
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, fresh.passwordHash);
  if (!valid) {
    return {
      ok: false,
      error: "Huidig wachtwoord klopt niet",
      fieldErrors: { currentPassword: "Onjuist" },
    };
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });
  return { ok: true };
}

export async function updateOrgAction(input: UpdateOrgInput): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "org:manage");
  const demoBlocked = blockDemoWrite(ctx);
  if (demoBlocked) return demoBlocked;

  const parsed = updateOrgSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }

  if (RESERVED_SLUGS.has(parsed.data.slug)) {
    return { ok: false, error: "Deze slug is gereserveerd", fieldErrors: { slug: "Gereserveerd" } };
  }

  // Slug uniqueness — only if changed
  if (parsed.data.slug !== ctx.organization.slug) {
    const conflict = await db.organization.findUnique({
      where: { slug: parsed.data.slug },
      select: { id: true },
    });
    if (conflict) {
      return {
        ok: false,
        error: "Deze slug is al in gebruik",
        fieldErrors: { slug: "Al in gebruik" },
      };
    }
  }

  await db.organization.update({
    where: { id: ctx.organization.id },
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      industry: parsed.data.industry || null,
    },
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "org.update",
    resource: "organization",
    resourceId: ctx.organization.id,
    metadata: {
      from: { name: ctx.organization.name, slug: ctx.organization.slug },
      to: { name: parsed.data.name, slug: parsed.data.slug },
    },
  });

  revalidatePath("/dashboard/settings/organization");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteOrgAction(input: DeleteOrgInput): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "org:manage");
  const demoBlocked = blockDemoWrite(ctx);
  if (demoBlocked) return demoBlocked;

  const parsed = deleteOrgSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Bevestiging vereist" };
  }

  // Confirmation must match the org name (case-insensitive)
  if (parsed.data.confirmation.trim().toLowerCase() !== ctx.organization.name.toLowerCase()) {
    return {
      ok: false,
      error: "Bevestiging komt niet overeen met de organisatienaam",
      fieldErrors: { confirmation: "Naam klopt niet" },
    };
  }

  await audit({
    actorUserId: ctx.user.id,
    action: "org.delete",
    resource: "organization",
    resourceId: ctx.organization.id,
    metadata: { name: ctx.organization.name, slug: ctx.organization.slug },
  });

  // onDelete: Cascade handles cleanup of memberships, items, bookings, etc.
  // Facturen blijven bestaan (organizationId → null) voor de fiscale
  // bewaarplicht.
  await db.organization.delete({ where: { id: ctx.organization.id } });

  // Geüploade afbeeldingen van de schijf halen — de dialoog belooft dat.
  await removeOrgUploads(ctx.organization.id);

  redirect("/dashboard");
}

/** Wist public/uploads/<orgId>; ontbrekende map = niets te doen. */
async function removeOrgUploads(organizationId: string): Promise<void> {
  // Alleen een cuid-achtige id toestaan zodat we nooit buiten de map werken.
  if (!/^[a-z0-9]+$/i.test(organizationId)) return;
  const dir = path.join(process.cwd(), "public", "uploads", organizationId);
  try {
    await rm(dir, { recursive: true, force: true });
  } catch (err) {
    console.error("[settings] uploads verwijderen mislukt:", err);
  }
}

/* -------------------- Account (gebruiker) -------------------- */

export async function updateEmailPreferencesAction(
  input: EmailPreferencesInput,
): Promise<ActionResult> {
  const user = await requireUser();
  const blocked = blockDemoWrite(user);
  if (blocked) return blocked;
  const parsed = emailPreferencesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ongeldige invoer" };

  await db.user.update({
    where: { id: user.id },
    data: {
      marketingOptIn: parsed.data.marketingOptIn,
      // Opnieuw aanmelden voor broadcast-mails gebeurt impliciet zodra de
      // gebruiker z'n voorkeuren bewust opslaat.
      broadcastEmailOptOutAt: null,
    },
  });
  await audit({
    actorUserId: user.id,
    action: "user.email-preferences.update",
    resource: "user",
    resourceId: user.id,
    metadata: { marketingOptIn: parsed.data.marketingOptIn },
  });
  revalidatePath("/dashboard/settings/profile");
  return { ok: true };
}

/**
 * Verwijdert het eigen account (AVG art. 17). Geweigerd zolang de gebruiker
 * eigenaar is van een organisatie met een actief abonnement (eerst opzeggen)
 * of de enige eigenaar van een organisatie is (eerst de organisatie
 * verwijderen of een ander eigenaar maken) — anders blijft er een
 * organisatie zonder eigenaar of met een lopende incasso achter.
 */
export async function deleteAccountAction(
  input: DeleteAccountInput,
): Promise<ActionResult> {
  const user = await requireUser();
  const blocked = blockDemoWrite(user);
  if (blocked) return blocked;
  if (user.isAdmin) {
    return {
      ok: false,
      error: "Beheerdersaccounts kunnen niet zelf worden verwijderd. Laat eerst je beheerdersrol intrekken.",
    };
  }
  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Wachtwoord is verplicht" };

  const fresh = await db.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!fresh?.passwordHash) {
    return { ok: false, error: "Geen wachtwoord ingesteld op dit account — mail ons om je account te laten verwijderen." };
  }
  const valid = await bcrypt.compare(parsed.data.password, fresh.passwordHash);
  if (!valid) {
    return { ok: false, error: "Wachtwoord klopt niet", fieldErrors: { password: "Onjuist" } };
  }

  const memberships = await db.membership.findMany({
    where: { userId: user.id, role: "OWNER" },
    select: {
      organization: {
        select: {
          id: true,
          name: true,
          subscriptionId: true,
          subscriptionStatus: true,
          cancelAtPeriodEnd: true,
          currentPeriodEnd: true,
          paidUntil: true,
        },
      },
    },
  });
  const now = Date.now();
  for (const { organization: org } of memberships) {
    const subscriptionActive =
      Boolean(org.subscriptionId) &&
      (org.subscriptionStatus === "active" || org.subscriptionStatus === "past_due");
    const periodRunning =
      (org.cancelAtPeriodEnd && org.currentPeriodEnd && org.currentPeriodEnd.getTime() > now) ||
      (org.paidUntil && org.paidUntil.getTime() > now);
    if (subscriptionActive || periodRunning) {
      return {
        ok: false,
        error: `Je bent eigenaar van "${org.name}" en die organisatie heeft een lopend abonnement. Zeg dat eerst op via Instellingen → Plan & facturatie en wacht tot het einde van de betaalde periode, of maak een ander teamlid eigenaar.`,
      };
    }
    const otherOwners = await db.membership.count({
      where: { organizationId: org.id, role: "OWNER", userId: { not: user.id } },
    });
    if (otherOwners === 0) {
      return {
        ok: false,
        error: `Je bent de enige eigenaar van "${org.name}". Verwijder die organisatie eerst (Instellingen → Organisatie) of maak een ander teamlid eigenaar.`,
      };
    }
  }

  await audit({
    actorUserId: user.id,
    action: "user.account.deleted",
    resource: "user",
    resourceId: user.id,
    metadata: { email: user.email },
  });

  await db.$transaction([
    // Uitnodigingen hebben een verplichte relatie met de uitnodiger (Restrict).
    db.invitation.deleteMany({ where: { invitedById: user.id } }),
    // Cascade: memberships, sessies, notificaties, stemmen, feedback.
    // SetNull: boekingen, tickets, CRM-notities blijven zonder auteur staan.
    db.user.delete({ where: { id: user.id } }),
  ]);

  return { ok: true };
}
