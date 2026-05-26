"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth/session";
import { assertCan } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit/log";
import type { ActionResult } from "@/lib/auth/schemas";

const createSchema = z.object({
  itemId: z.string().min(1, "Kies een item"),
  customerName: z.string().trim().min(1, "Naam is verplicht").max(120),
  customerEmail: z.string().trim().toLowerCase().email("Geldig e-mailadres vereist"),
  customerPhone: z.string().trim().max(40).default(""),
  desiredStartAt: z.string().min(1, "Startdatum vereist"),
  desiredEndAt: z.string().min(1, "Einddatum vereist"),
  notes: z.string().trim().max(500).default(""),
});

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const p = i.path.join(".");
    if (!out[p]) out[p] = i.message;
  }
  return out;
}

export async function createWaitlistEntryAction(input: {
  itemId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  desiredStartAt: string;
  desiredEndAt: string;
  notes?: string;
}): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "bookings:manage");

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }

  const start = new Date(parsed.data.desiredStartAt);
  const end = new Date(parsed.data.desiredEndAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return {
      ok: false,
      error: "Einddatum moet ná startdatum liggen",
      fieldErrors: { desiredEndAt: "Eind ná start" },
    };
  }

  const item = await db.item.findFirst({
    where: { id: parsed.data.itemId, organizationId: ctx.organization.id },
    select: { id: true },
  });
  if (!item) return { ok: false, error: "Item niet gevonden" };

  // Probeer een bestaande Customer te koppelen — op email is genoeg.
  const customer = await db.customer.findFirst({
    where: {
      organizationId: ctx.organization.id,
      email: parsed.data.customerEmail,
    },
    select: { id: true },
  });

  const entry = await db.waitlistEntry.create({
    data: {
      organizationId: ctx.organization.id,
      itemId: item.id,
      customerId: customer?.id ?? null,
      customerName: parsed.data.customerName,
      customerEmail: parsed.data.customerEmail,
      customerPhone: parsed.data.customerPhone || null,
      desiredStartAt: start,
      desiredEndAt: end,
      notes: parsed.data.notes || null,
    },
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "waitlist.create",
    resource: "waitlistEntry",
    resourceId: entry.id,
    metadata: { itemId: item.id, email: parsed.data.customerEmail },
  });

  revalidatePath("/dashboard/waitlist");
  return { ok: true };
}

export async function updateWaitlistStatusAction(input: {
  id: string;
  status: "WAITING" | "NOTIFIED" | "CONVERTED" | "EXPIRED";
}): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "bookings:manage");

  const entry = await db.waitlistEntry.findFirst({
    where: { id: input.id, organizationId: ctx.organization.id },
    select: { id: true },
  });
  if (!entry) return { ok: false, error: "Niet gevonden" };

  await db.waitlistEntry.update({
    where: { id: entry.id },
    data: {
      status: input.status,
      notifiedAt: input.status === "NOTIFIED" ? new Date() : undefined,
    },
  });
  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "waitlist.status.update",
    resource: "waitlistEntry",
    resourceId: entry.id,
    metadata: { to: input.status },
  });
  revalidatePath("/dashboard/waitlist");
  return { ok: true };
}

export async function deleteWaitlistEntryAction(id: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "bookings:manage");
  const result = await db.waitlistEntry.deleteMany({
    where: { id, organizationId: ctx.organization.id },
  });
  if (result.count === 0) return { ok: false, error: "Niet gevonden" };
  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "waitlist.delete",
    resource: "waitlistEntry",
    resourceId: id,
  });
  revalidatePath("/dashboard/waitlist");
  return { ok: true };
}
