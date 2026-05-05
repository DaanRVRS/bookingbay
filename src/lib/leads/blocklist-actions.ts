"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth/session";
import { assertCan } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/auth/schemas";
import { audit } from "@/lib/audit/log";

const patternSchema = z
  .string()
  .min(3, "Te kort")
  .max(254, "Te lang")
  .regex(
    /^(?:@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|[^\s@]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})$/,
    "Gebruik 'naam@voorbeeld.nl' of '@voorbeeld.nl' om het hele domein te blokkeren",
  );

const blockSchema = z.object({
  pattern: patternSchema,
  reason: z.string().max(200).optional().or(z.literal("")),
});

export async function addLeadBlockAction(input: {
  pattern: string;
  reason?: string;
}): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "bookings:manage");

  const parsed = blockSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const path = i.path.join(".");
      if (!fields[path]) fields[path] = i.message;
    }
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fields };
  }

  const lower = parsed.data.pattern.toLowerCase().trim();

  try {
    await db.leadBlock.create({
      data: {
        organizationId: ctx.organization.id,
        pattern: lower,
        reason: parsed.data.reason || null,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique")) {
      return { ok: false, error: "Dit adres of domein staat al op de blocklist" };
    }
    throw err;
  }

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "leadblock.add",
    resource: "leadblock",
    metadata: { pattern: lower },
  });

  revalidatePath("/dashboard/leads/blocklist");
  return { ok: true };
}

export async function removeLeadBlockAction(id: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "bookings:manage");

  const existing = await db.leadBlock.findFirst({
    where: { id, organizationId: ctx.organization.id },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };

  await db.leadBlock.delete({ where: { id } });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "leadblock.remove",
    resource: "leadblock",
    metadata: { pattern: existing.pattern },
  });

  revalidatePath("/dashboard/leads/blocklist");
  return { ok: true };
}

/**
 * Convenience: block the email of an existing lead with one click.
 * blockType="email" → exact address; "domain" → entire domain (e.g. "@gmail.com").
 */
export async function blockLeadSenderAction(
  leadId: string,
  blockType: "email" | "domain",
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "bookings:manage");

  const lead = await db.lead.findFirst({
    where: { id: leadId, organizationId: ctx.organization.id },
    select: { email: true },
  });
  if (!lead) return { ok: false, error: "Lead niet gevonden" };

  const lower = lead.email.toLowerCase();
  const at = lower.lastIndexOf("@");
  if (at < 0) return { ok: false, error: "Onbekend e-mailformaat" };
  const pattern = blockType === "domain" ? lower.slice(at) : lower;

  await db.leadBlock.upsert({
    where: { organizationId_pattern: { organizationId: ctx.organization.id, pattern } },
    create: {
      organizationId: ctx.organization.id,
      pattern,
      reason: `Geblokkeerd vanuit lead ${leadId}`,
    },
    update: {},
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "leadblock.add",
    resource: "leadblock",
    metadata: { pattern, fromLead: leadId },
  });

  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard/leads/blocklist");
  return { ok: true };
}
