"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth/session";
import { assertCan } from "@/lib/auth/permissions";
import { checkAvailability } from "./conflicts";
import {
  sumAddons,
  sumFlatFees,
  addonAppliesToCategory,
  type BookingAddonLine,
} from "./price";
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
import { blockDemoWrite } from "@/lib/demo/guard";
import { syncBookingExternal } from "@/lib/integrations/sync-booking";

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const path = i.path.join(".");
    if (!out[path]) out[path] = i.message;
  }
  return out;
}

/**
 * Zet de gevraagde add-ons (itemId + aantal) om in prijs-regels met de
 * ECHTE naam/prijs uit de DB — nooit de client-waarden vertrouwen. Alleen
 * actieve isAddon-items van deze org met een geldige prijs tellen mee, en
 * alleen als hun categorie-scope het hoofd-item dekt (`itemCategoryIds` =
 * categorie van het hoofd-item + evt. parent).
 */
async function resolveAddonLines(
  organizationId: string,
  requested: { itemId: string; quantity: number }[] | undefined,
  itemCategoryIds: string[],
): Promise<BookingAddonLine[]> {
  const list = (requested ?? []).filter((a) => a.quantity > 0);
  if (list.length === 0) return [];
  const items = await db.item.findMany({
    where: {
      id: { in: list.map((a) => a.itemId) },
      organizationId,
      isActive: true,
      isAddon: true,
      addonPrice: { not: null },
    },
    select: { id: true, name: true, addonPrice: true, addonCategoryIds: true },
  });
  const byId = new Map(items.map((i) => [i.id, i]));
  const lines: BookingAddonLine[] = [];
  for (const req of list) {
    const it = byId.get(req.itemId);
    if (!it || it.addonPrice == null) continue;
    const scope = Array.isArray(it.addonCategoryIds)
      ? (it.addonCategoryIds as string[])
      : null;
    if (!addonAppliesToCategory(scope, itemCategoryIds)) continue;
    lines.push({
      itemId: it.id,
      name: it.name,
      unitPrice: Number(it.addonPrice),
      quantity: req.quantity,
    });
  }
  return lines;
}

export async function createBookingAction(
  input: BookingCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "bookings:manage");
  const demoBlocked = blockDemoWrite(ctx);
  if (demoBlocked) return demoBlocked;
  const blocked = await assertOrgActive(ctx.organization.id);
  if (blocked) return blocked;

  const parsed = bookingCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }

  // Validate item + customer belong to org. isAddon: false — een add-on is
  // nooit het hoofd-item van een boeking.
  const [item, customer] = await Promise.all([
    db.item.findFirst({
      where: { id: parsed.data.itemId, organizationId: ctx.organization.id, isAddon: false },
      select: {
        id: true,
        quantity: true,
        isActive: true,
        categoryId: true,
        category: { select: { parentId: true } },
        cleaningFee: true,
      captainFee: true,
      fuelFee: true,
      },
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

  // Add-ons: prijs server-side ophalen en bovenop het item-bedrag tellen.
  const itemCategoryIds = [item.categoryId, item.category.parentId].filter(
    (v): v is string => Boolean(v),
  );
  const addonLines = await resolveAddonLines(
    ctx.organization.id,
    parsed.data.addons,
    itemCategoryIds,
  );
  // Schoonmaakkosten server-side bijtellen — consistent met de publieke flow.
  const grandTotal =
    parsed.data.totalPrice + sumFlatFees(item) + sumAddons(addonLines);

  const created = await db.booking.create({
    data: {
      organizationId: ctx.organization.id,
      itemId: parsed.data.itemId,
      customerId: parsed.data.customerId,
      startAt: parsed.data.startAt,
      endAt: parsed.data.endAt,
      status: parsed.data.status,
      totalPrice: grandTotal,
      notes: parsed.data.notes || null,
      addons:
        addonLines.length > 0
          ? (addonLines as unknown as Prisma.InputJsonValue)
          : undefined,
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

  // Push naar gekoppelde externe systemen (Google Calendar, etc.). Best-
  // effort — een API-storing daar mag nooit de boeking blokkeren.
  await syncBookingExternal(created.id, "upsert");

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/calendar");
  return { ok: true, data: { id: created.id } };
}

export async function updateBookingAction(input: BookingUpdateInput): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "bookings:manage");
  const demoBlocked = blockDemoWrite(ctx);
  if (demoBlocked) return demoBlocked;

  const parsed = bookingUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }

  const existing = await db.booking.findFirst({
    where: { id: parsed.data.id, organizationId: ctx.organization.id },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };

  const item = await db.item.findFirst({
    where: { id: parsed.data.itemId, organizationId: ctx.organization.id, isAddon: false },
    select: {
      id: true,
      quantity: true,
      categoryId: true,
      category: { select: { parentId: true } },
      cleaningFee: true,
      captainFee: true,
      fuelFee: true,
    },
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

  const addonLines = await resolveAddonLines(
    ctx.organization.id,
    parsed.data.addons,
    [item.categoryId, item.category.parentId].filter((v): v is string => Boolean(v)),
  );
  const grandTotal =
    parsed.data.totalPrice + sumFlatFees(item) + sumAddons(addonLines);

  await db.booking.update({
    where: { id: parsed.data.id },
    data: {
      itemId: parsed.data.itemId,
      customerId: parsed.data.customerId,
      startAt: parsed.data.startAt,
      endAt: parsed.data.endAt,
      status: parsed.data.status,
      totalPrice: grandTotal,
      notes: parsed.data.notes || null,
      addons:
        addonLines.length > 0
          ? (addonLines as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
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

  await syncBookingExternal(parsed.data.id, "upsert");

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${parsed.data.id}`);
  return { ok: true };
}

export async function cancelBookingAction(id: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "bookings:manage");
  const demoBlocked = blockDemoWrite(ctx);
  if (demoBlocked) return demoBlocked;

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

  await syncBookingExternal(id, "delete");

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${id}`);
  return { ok: true };
}

/**
 * Voltooi een boeking handmatig — vraagt om optionele schade-vlag +
 * opmerkingen. Slaat completedAt op zodat we later kunnen rapporteren.
 */
export async function completeBookingAction(input: {
  id: string;
  damage: boolean;
  notes?: string;
}): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "bookings:manage");
  const demoBlocked = blockDemoWrite(ctx);
  if (demoBlocked) return demoBlocked;

  const existing = await db.booking.findFirst({
    where: { id: input.id, organizationId: ctx.organization.id },
    select: { id: true, status: true },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };
  if (existing.status === "CANCELED") {
    return { ok: false, error: "Geannuleerde boekingen kunnen niet worden voltooid." };
  }

  await db.booking.update({
    where: { id: input.id },
    data: {
      status: "COMPLETED",
      completionDamage: Boolean(input.damage),
      completionNotes: input.notes?.trim() || null,
      completedAt: new Date(),
    },
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "booking.complete",
    resource: "booking",
    resourceId: input.id,
    metadata: { damage: Boolean(input.damage), hasNotes: Boolean(input.notes?.trim()) },
  });

  await syncBookingExternal(input.id, "upsert");

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${input.id}`);
  return { ok: true };
}

export async function setBookingStatusAction(
  id: string,
  status: (typeof bookingStatusValues)[number],
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "bookings:manage");
  const demoBlocked = blockDemoWrite(ctx);
  if (demoBlocked) return demoBlocked;

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

  await syncBookingExternal(id, status === "CANCELED" ? "delete" : "upsert");

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
  const demoBlocked = blockDemoWrite(ctx);
  if (demoBlocked) return demoBlocked;

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
    where: { id: newItemId, organizationId: ctx.organization.id, isAddon: false },
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

  await syncBookingExternal(existing.id, "upsert");

  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${existing.id}`);
  return { ok: true };
}

export async function checkBookingAvailability(input: AvailabilityCheckInput) {
  const ctx = await requireOrg();
  const item = await db.item.findFirst({
    where: { id: input.itemId, organizationId: ctx.organization.id, isAddon: false },
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
