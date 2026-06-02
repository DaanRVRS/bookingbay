"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  type UpdateProfileInput,
  type ChangePasswordInput,
  type UpdateOrgInput,
  type DeleteOrgInput,
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
  await db.organization.delete({ where: { id: ctx.organization.id } });

  redirect("/dashboard");
}
