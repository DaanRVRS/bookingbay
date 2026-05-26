"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth/session";
import { assertCan } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit/log";
import type { ActionResult } from "@/lib/auth/schemas";
import { startOfDay, setDay, setDate, addWeeks, getDaysInMonth } from "date-fns";

const createSchema = z.object({
  itemId: z.string().min(1, "Kies een item"),
  customerId: z.string().min(1, "Kies een klant"),
  frequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]),
  // 0-6 voor WEEKLY/BIWEEKLY, 1-31 voor MONTHLY.
  dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
  dayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
  startTimeMin: z.coerce.number().int().min(0).max(1440),
  endTimeMin: z.coerce.number().int().min(0).max(1440),
  // ISO-date string (alleen-datum) voor wanneer de reeks begint.
  startDate: z.string().min(1, "Startdatum vereist"),
  // Optionele einddatum.
  endDate: z.string().optional().default(""),
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

/**
 * Berekent de eerste concrete datum waarop deze reeks moet draaien.
 *  - WEEKLY/BIWEEKLY: eerste startDate-of-later die op dayOfWeek valt
 *  - MONTHLY: startDate met dayOfMonth (gecapt op laatste dag van die maand)
 */
function calcFirstRun(
  startDate: Date,
  frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY",
  dayOfWeek: number | undefined,
  dayOfMonth: number | undefined,
): Date {
  const base = startOfDay(startDate);
  if (frequency === "MONTHLY") {
    const dom = dayOfMonth ?? base.getDate();
    const max = getDaysInMonth(base);
    return setDate(base, Math.min(dom, max));
  }
  if (dayOfWeek === undefined) return base;
  let candidate = setDay(base, dayOfWeek, { weekStartsOn: 1 });
  if (candidate < base) candidate = addWeeks(candidate, 1);
  return candidate;
}

export async function createRecurringBookingAction(input: {
  itemId: string;
  customerId: string;
  frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  dayOfWeek?: number;
  dayOfMonth?: number;
  startTimeMin: number;
  endTimeMin: number;
  startDate: string;
  endDate?: string;
  notes?: string;
}): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "bookings:manage");

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }
  if (parsed.data.endTimeMin <= parsed.data.startTimeMin) {
    return {
      ok: false,
      error: "Eindtijd moet ná de starttijd liggen",
      fieldErrors: { endTimeMin: "Eind ná start" },
    };
  }
  if (parsed.data.frequency !== "MONTHLY" && parsed.data.dayOfWeek === undefined) {
    return { ok: false, error: "Kies een dag van de week" };
  }
  if (parsed.data.frequency === "MONTHLY" && parsed.data.dayOfMonth === undefined) {
    return { ok: false, error: "Kies een dag van de maand" };
  }

  const item = await db.item.findFirst({
    where: { id: parsed.data.itemId, organizationId: ctx.organization.id },
    select: { id: true },
  });
  if (!item) return { ok: false, error: "Item niet gevonden" };

  const customer = await db.customer.findFirst({
    where: { id: parsed.data.customerId, organizationId: ctx.organization.id },
    select: { id: true },
  });
  if (!customer) return { ok: false, error: "Klant niet gevonden" };

  const startDate = new Date(parsed.data.startDate);
  if (Number.isNaN(startDate.getTime())) {
    return { ok: false, error: "Ongeldige startdatum", fieldErrors: { startDate: "Ongeldige datum" } };
  }
  const endsAt = parsed.data.endDate ? new Date(parsed.data.endDate) : null;
  if (endsAt && Number.isNaN(endsAt.getTime())) {
    return { ok: false, error: "Ongeldige einddatum", fieldErrors: { endDate: "Ongeldige datum" } };
  }

  const nextRunAt = calcFirstRun(
    startDate,
    parsed.data.frequency,
    parsed.data.dayOfWeek,
    parsed.data.dayOfMonth,
  );

  const created = await db.recurringBooking.create({
    data: {
      organizationId: ctx.organization.id,
      itemId: item.id,
      customerId: customer.id,
      frequency: parsed.data.frequency,
      dayOfWeek: parsed.data.dayOfWeek ?? null,
      dayOfMonth: parsed.data.dayOfMonth ?? null,
      startTimeMin: parsed.data.startTimeMin,
      endTimeMin: parsed.data.endTimeMin,
      nextRunAt,
      endsAt,
      notes: parsed.data.notes || null,
    },
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "recurring.create",
    resource: "recurringBooking",
    resourceId: created.id,
    metadata: {
      itemId: item.id,
      customerId: customer.id,
      frequency: parsed.data.frequency,
    },
  });

  revalidatePath("/dashboard/recurring");
  return { ok: true };
}

export async function toggleRecurringActiveAction(input: {
  id: string;
  isActive: boolean;
}): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "bookings:manage");

  const existing = await db.recurringBooking.findFirst({
    where: { id: input.id, organizationId: ctx.organization.id },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };

  await db.recurringBooking.update({
    where: { id: existing.id },
    data: { isActive: input.isActive },
  });
  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "recurring.toggle",
    resource: "recurringBooking",
    resourceId: existing.id,
    metadata: { isActive: input.isActive },
  });
  revalidatePath("/dashboard/recurring");
  return { ok: true };
}

export async function deleteRecurringAction(id: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "bookings:manage");
  const result = await db.recurringBooking.deleteMany({
    where: { id, organizationId: ctx.organization.id },
  });
  if (result.count === 0) return { ok: false, error: "Niet gevonden" };
  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "recurring.delete",
    resource: "recurringBooking",
    resourceId: id,
  });
  revalidatePath("/dashboard/recurring");
  return { ok: true };
}
