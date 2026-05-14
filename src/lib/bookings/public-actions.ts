"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { checkAvailability } from "./conflicts";
import { audit } from "@/lib/audit/log";
import { publicBookingSchema, type PublicBookingInput } from "./public-schemas";
import type { ActionResult } from "@/lib/auth/schemas";

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const path = i.path.join(".");
    if (!out[path]) out[path] = i.message;
  }
  return out;
}

export async function createPublicBookingAction(
  input: PublicBookingInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = publicBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }

  const data = parsed.data;

  const org = await db.organization.findUnique({
    where: { slug: data.slug },
    select: { id: true, suspendedAt: true },
  });
  if (!org) return { ok: false, error: "Organisatie niet gevonden" };
  if (org.suspendedAt) {
    return {
      ok: false,
      error: "Deze verhuurder accepteert momenteel geen online boekingen.",
    };
  }

  const item = await db.item.findFirst({
    where: { id: data.itemId, organizationId: org.id, isActive: true },
    select: { id: true, quantity: true, pricePerDay: true, pricePerHour: true },
  });
  if (!item) {
    return { ok: false, error: "Item niet gevonden", fieldErrors: { itemId: "Onbekend item" } };
  }

  const startAt = new Date(data.startAt);
  const endAt = new Date(data.endAt);

  const availability = await checkAvailability({
    organizationId: org.id,
    itemId: item.id,
    itemQuantity: item.quantity,
    startAt,
    endAt,
  });
  if (!availability.available) {
    return { ok: false, error: availability.message ?? "Niet beschikbaar in deze periode" };
  }

  const emailLower = data.customerEmail.trim().toLowerCase();
  const phone = data.customerPhone?.trim() || null;

  // Find existing customer by email within this org, else create new.
  let customer = await db.customer.findFirst({
    where: { organizationId: org.id, email: emailLower },
    select: { id: true },
  });
  if (!customer) {
    customer = await db.customer.create({
      data: {
        organizationId: org.id,
        name: data.customerName.trim(),
        email: emailLower,
        phone,
      },
      select: { id: true },
    });
  }

  // Estimate price from item's day-price × duration in days (ceil),
  // falling back to hour-price × hours, else 0. Tenant adjusts on confirm.
  const durationMs = endAt.getTime() - startAt.getTime();
  const days = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
  const hours = Math.ceil(durationMs / (1000 * 60 * 60));
  let estimate = 0;
  if (item.pricePerDay) {
    estimate = Number(item.pricePerDay) * days;
  } else if (item.pricePerHour) {
    estimate = Number(item.pricePerHour) * hours;
  }

  const booking = await db.booking.create({
    data: {
      organizationId: org.id,
      itemId: item.id,
      customerId: customer.id,
      startAt,
      endAt,
      status: "PENDING",
      totalPrice: estimate,
      notes: data.notes?.trim() || null,
    },
    select: { id: true },
  });

  await audit({
    organizationId: org.id,
    action: "booking.create",
    resource: "booking",
    resourceId: booking.id,
    metadata: {
      source: "public-widget",
      itemId: item.id,
      customerId: customer.id,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
    },
  });

  return { ok: true, data: { id: booking.id } };
}
