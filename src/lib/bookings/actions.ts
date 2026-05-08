"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth/session";
import { assertCan } from "@/lib/auth/permissions";
import { checkAvailability } from "./conflicts";
import {
  bookingCreateSchema,
  bookingUpdateSchema,
  bookingStatusValues,
  type BookingCreateInput,
  type BookingUpdateInput,
} from "./schemas";
import type { ActionResult } from "@/lib/auth/schemas";
import { audit } from "@/lib/audit/log";
import { assertOrgActive } from "@/lib/billing/guard";

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const path = i.path.join(".");
    if (!out[path]) out[path] = i.message;
  }
  return out;
}

export async function createBookingAction(
  input: BookingCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "bookings:manage");
  const blocked = await assertOrgActive(ctx.organization.id);
  if (blocked) return blocked;

  const parsed = bookingCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }

  // Validate item + customer belong to org
  const [item, customer] = await Promise.all([
    db.item.findFirst({
      where: { id: parsed.data.itemId, organizationId: ctx.organization.id },
      select: { id: true, quantity: true, isActive: true },
    }),
    db.customer.findFirst({
      where: { id: parsed.data.customerId, organizationId: ctx.organization.id },
      select: { id: true },
    }),
  ]);

  if (!item) return { ok: false, error: "Item niet gevonden", fieldErrors: { itemId: "Onbekend item" } };
  if (!customer) return { ok: false, error: "Klant niet gevonden", fieldErrors: { customerId: "Onbekende klant" } };

  // Conflict check
  if (parsed.data.status !== "CANCELED") {
    const availability = await checkAvailability({
      organizationId: ctx.organization.id,
      itemId: item.id,
      itemQuantity: item.quantity,
      startAt: parsed.data.startAt,
      endAt: parsed.data.endAt,
    });
    if (!availability.available) {
      return { ok: false, error: availability.message ?? "Conflict in deze periode" };
    }
  }

  const created = await db.booking.create({
    data: {
      organizationId: ctx.organization.id,
      itemId: parsed.data.itemId,
      customerId: parsed.data.customerId,
      startAt: parsed.data.startAt,
      endAt: parsed.data.endAt,
      status: parsed.data.status,
      totalPrice: parsed.data.totalPrice,
      notes: parsed.data.notes || null,
      createdById: ctx.user.id,
    },
    select: { id: true },
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "booking.create",
    resource: "booking",
    resourceId: created.id,
    metadata: {
      itemId: parsed.data.itemId,
      customerId: parsed.data.customerId,
      startAt: parsed.data.startAt.toISOString(),
      endAt: parsed.data.endAt.toISOString(),
      status: parsed.data.status,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/calendar");
  return { ok: true, data: { id: created.id } };
}

export async function updateBookingAction(input: BookingUpdateInput): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "bookings:manage");

  const parsed = bookingUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }

  const existing = await db.booking.findFirst({
    where: { id: parsed.data.id, organizationId: ctx.organization.id },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };

  const item = await db.item.findFirst({
    where: { id: parsed.data.itemId, organizationId: ctx.organization.id },
    select: { id: true, quantity: true },
  });
  if (!item) return { ok: false, error: "Item niet gevonden" };

  if (parsed.data.status !== "CANCELED") {
    const availability = await checkAvailability({
      organizationId: ctx.organization.id,
      itemId: item.id,
      itemQuantity: item.quantity,
      startAt: parsed.data.startAt,
      endAt: parsed.data.endAt,
      excludeBookingId: parsed.data.id,
    });
    if (!availability.available) {
      return { ok: false, error: availability.message ?? "Conflict in deze periode" };
    }
  }

  await db.booking.update({
    where: { id: parsed.data.id },
    data: {
      itemId: parsed.data.itemId,
      customerId: parsed.data.customerId,
      startAt: parsed.data.startAt,
      endAt: parsed.data.endAt,
      status: parsed.data.status,
      totalPrice: parsed.data.totalPrice,
      notes: parsed.data.notes || null,
    },
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "booking.update",
    resource: "booking",
    resourceId: parsed.data.id,
    metadata: { status: parsed.data.status },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${parsed.data.id}`);
  return { ok: true };
}

export async function cancelBookingAction(id: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "bookings:manage");

  const existing = await db.booking.findFirst({
    where: { id, organizationId: ctx.organization.id },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };

  await db.booking.update({
    where: { id },
    data: { status: "CANCELED" },
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "booking.cancel",
    resource: "booking",
    resourceId: id,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${id}`);
  return { ok: true };
}

export async function setBookingStatusAction(
  id: string,
  status: (typeof bookingStatusValues)[number],
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "bookings:manage");

  const existing = await db.booking.findFirst({
    where: { id, organizationId: ctx.organization.id },
    select: { id: true, itemId: true, startAt: true, endAt: true, item: { select: { quantity: true } } },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };

  // If reactivating from canceled, check conflicts
  if (status !== "CANCELED") {
    const availability = await checkAvailability({
      organizationId: ctx.organization.id,
      itemId: existing.itemId,
      itemQuantity: existing.item.quantity,
      startAt: existing.startAt,
      endAt: existing.endAt,
      excludeBookingId: id,
    });
    if (!availability.available) {
      return { ok: false, error: availability.message ?? "Conflict — niet te reactiveren" };
    }
  }

  await db.booking.update({ where: { id }, data: { status } });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "booking.status",
    resource: "booking",
    resourceId: id,
    metadata: { status },
  });

  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${id}`);
  return { ok: true };
}

interface AvailabilityCheckInput {
  itemId: string;
  startAt: Date | string;
  endAt: Date | string;
  excludeBookingId?: string;
}

/**
 * Lightweight move-booking action used by the calendar drag-and-drop.
 * Preserves the booking's duration; optionally re-assigns to a different
 * item. Does conflict-checking against the new item, but never against
 * the booking being moved itself.
 */
export async function moveBookingAction(input: {
  id: string;
  newStartAt: string;
  newItemId?: string;
}): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "bookings:manage");

  const existing = await db.booking.findFirst({
    where: { id: input.id, organizationId: ctx.organization.id },
    select: {
      id: true,
      itemId: true,
      startAt: true,
      endAt: true,
      status: true,
    },
  });
  if (!existing) return { ok: false, error: "Boeking niet gevonden" };

  const newStartAt = new Date(input.newStartAt);
  if (Number.isNaN(newStartAt.getTime())) {
    return { ok: false, error: "Ongeldige nieuwe starttijd" };
  }
  const durationMs = existing.endAt.getTime() - existing.startAt.getTime();
  const newEndAt = new Date(newStartAt.getTime() + durationMs);
  const newItemId = input.newItemId ?? existing.itemId;

  // No-op? Skip the database round-trip.
  if (
    newItemId === existing.itemId &&
    newStartAt.getTime() === existing.startAt.getTime()
  ) {
    return { ok: true };
  }

  const item = await db.item.findFirst({
    where: { id: newItemId, organizationId: ctx.organization.id },
    select: { id: true, quantity: true, name: true },
  });
  if (!item) return { ok: false, error: "Item niet gevonden" };

  if (existing.status !== "CANCELED") {
    const availability = await checkAvailability({
      organizationId: ctx.organization.id,
      itemId: item.id,
      itemQuantity: item.quantity,
      startAt: newStartAt,
      endAt: newEndAt,
      excludeBookingId: existing.id,
    });
    if (!availability.available) {
      return { ok: false, error: availability.message ?? "Conflict in deze periode" };
    }
  }

  await db.booking.update({
    where: { id: existing.id },
    data: {
      itemId: newItemId,
      startAt: newStartAt,
      endAt: newEndAt,
    },
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "booking.move",
    resource: "booking",
    resourceId: existing.id,
    metadata: {
      from: {
        itemId: existing.itemId,
        startAt: existing.startAt.toISOString(),
      },
      to: {
        itemId: newItemId,
        startAt: newStartAt.toISOString(),
      },
    },
  });

  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${existing.id}`);
  return { ok: true };
}

export async function checkBookingAvailability(input: AvailabilityCheckInput) {
  const ctx = await requireOrg();
  const item = await db.item.findFirst({
    where: { id: input.itemId, organizationId: ctx.organization.id },
    select: { id: true, quantity: true },
  });
  if (!item) return { available: false, message: "Item niet gevonden", overlapping: [] };

  const startAt = new Date(input.startAt);
  const endAt = new Date(input.endAt);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
    return { available: false, message: "Ongeldig tijdvak", overlapping: [] };
  }

  const result = await checkAvailability({
    organizationId: ctx.organization.id,
    itemId: item.id,
    itemQuantity: item.quantity,
    startAt,
    endAt,
    excludeBookingId: input.excludeBookingId,
  });

  return {
    available: result.available,
    message: result.message,
    overlapping: result.overlapping.map((o) => ({
      id: o.id,
      startAt: o.startAt.toISOString(),
      endAt: o.endAt.toISOString(),
      customerName: o.customer.name,
    })),
  };
}
