import { db } from "@/lib/db";

export type BookingStatusForOverlap = "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";

interface ConflictCheckParams {
  organizationId: string;
  itemId: string;
  startAt: Date;
  endAt: Date;
  excludeBookingId?: string;
}

/**
 * Pure helper: do two date ranges overlap? Touching at the edges is NOT
 * an overlap (a booking that ends at 12:00 doesn't conflict with one
 * that starts at 12:00).
 */
export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Pure helper: given a candidate range and the existing bookings for the
 * same item, is the slot available? CANCELED bookings + a passed
 * excludeId are skipped. The slot is "taken" once the count of
 * concurrent active bookings reaches itemQuantity.
 */
export function isSlotAvailable(params: {
  start: Date;
  end: Date;
  itemQuantity: number;
  existing: { id: string; startAt: Date; endAt: Date; status: BookingStatusForOverlap }[];
  excludeBookingId?: string;
}): { available: boolean; usedSlots: number } {
  const overlapping = params.existing.filter((b) => {
    if (b.status === "CANCELED") return false;
    if (params.excludeBookingId && b.id === params.excludeBookingId) return false;
    return rangesOverlap(b.startAt, b.endAt, params.start, params.end);
  });
  return {
    available: overlapping.length < params.itemQuantity,
    usedSlots: overlapping.length,
  };
}

export async function findOverlappingBookings(params: ConflictCheckParams) {
  return db.booking.findMany({
    where: {
      organizationId: params.organizationId,
      itemId: params.itemId,
      status: { not: "CANCELED" },
      startAt: { lt: params.endAt },
      endAt: { gt: params.startAt },
      ...(params.excludeBookingId ? { NOT: { id: params.excludeBookingId } } : {}),
    },
    include: {
      customer: { select: { name: true } },
    },
    orderBy: { startAt: "asc" },
  });
}

export async function checkAvailability(
  params: ConflictCheckParams & { itemQuantity: number },
): Promise<{
  available: boolean;
  overlapping: Awaited<ReturnType<typeof findOverlappingBookings>>;
  message?: string;
}> {
  const overlapping = await findOverlappingBookings(params);
  const usedSlots = overlapping.length;
  const available = usedSlots < params.itemQuantity;

  return {
    available,
    overlapping,
    message: available
      ? undefined
      : params.itemQuantity === 1
        ? "Item is al geboekt in deze periode"
        : `Alle ${params.itemQuantity} exemplaren zijn bezet in deze periode`,
  };
}
