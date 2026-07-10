import { Prisma } from "@prisma/client";
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

/**
 * Externe agenda-blokken (Google Calendar etc.) die het item raken.
 * Rijen met `itemId = null` raken *alle* items op die calendar; rijen
 * met een specifieke itemId raken alleen dat item.
 */
export async function findOverlappingCalendarBlocks(params: {
  organizationId: string;
  itemId: string;
  startAt: Date;
  endAt: Date;
}) {
  return db.calendarBlock.findMany({
    where: {
      organizationId: params.organizationId,
      startAt: { lt: params.endAt },
      endAt: { gt: params.startAt },
      OR: [{ itemId: params.itemId }, { itemId: null }],
    },
    orderBy: { startAt: "asc" },
  });
}

export async function checkAvailability(
  params: ConflictCheckParams & { itemQuantity: number },
): Promise<{
  available: boolean;
  overlapping: Awaited<ReturnType<typeof findOverlappingBookings>>;
  blocks: Awaited<ReturnType<typeof findOverlappingCalendarBlocks>>;
  message?: string;
}> {
  const [overlapping, blocks] = await Promise.all([
    findOverlappingBookings(params),
    findOverlappingCalendarBlocks(params),
  ]);
  // Externe blokken tellen mee tegen `itemQuantity`. Bij quantity=1 is
  // één blok genoeg om dicht te zetten; bij quantity=3 trekken ze van
  // de capaciteit af. Conservatief: we behandelen elk overlappend blok
  // als één bezet exemplaar.
  // Een item met quantity 0 ('n.v.t.'/data-fout) behandelen we als 1 boekbaar
  // exemplaar — consistent met de widget, die ook minimaal 1 toont. Anders
  // weigert de server élke boeking terwijl de UI het slot vrij toont.
  const capacity = params.itemQuantity > 0 ? params.itemQuantity : 1;
  const usedSlots = overlapping.length + blocks.length;
  const available = usedSlots < capacity;

  let message: string | undefined;
  if (!available) {
    if (blocks.length > 0 && overlapping.length === 0) {
      message = "Deze tijd staat geblokkeerd in de gekoppelde agenda";
    } else if (capacity === 1) {
      message = "Item is al geboekt in deze periode";
    } else {
      message = `Alle ${capacity} exemplaren zijn bezet in deze periode`;
    }
  }

  return { available, overlapping, blocks, message };
}

/** Interne throw-marker voor een vol slot binnen de guard-transactie. */
export const BOOKING_CONFLICT = "BOOKING_SLOT_TAKEN";

/**
 * Race-vrije conflict-check + schrijfactie binnen één Serializable-transactie.
 * Telt actieve boekingen + agenda-blokken die het slot raken en gooit
 * BOOKING_CONFLICT als de capaciteit vol is; draait daarna `write` binnen
 * dezelfde transactie. Twee gelijktijdige requests voor hetzelfde slot kunnen
 * zo niet allebei inserten — Postgres SSI detecteert de write-skew (P2034).
 *
 * De losse `checkAvailability` blijft bruikbaar als snelle pre-check voor
 * nette UX-feedback, maar deze guard is de daadwerkelijke bescherming en moet
 * élke dashboard-write (create/update/move/reactivate) omhullen — net als de
 * publieke flow.
 */
export async function withBookingConflictGuard<T>(params: {
  organizationId: string;
  itemId: string;
  itemQuantity: number;
  startAt: Date;
  endAt: Date;
  excludeBookingId?: string;
  write: (tx: Prisma.TransactionClient) => Promise<T>;
}): Promise<T> {
  return db.$transaction(
    async (tx) => {
      const [overlap, blocked] = await Promise.all([
        tx.booking.count({
          where: {
            itemId: params.itemId,
            organizationId: params.organizationId,
            status: { not: "CANCELED" },
            startAt: { lt: params.endAt },
            endAt: { gt: params.startAt },
            ...(params.excludeBookingId ? { NOT: { id: params.excludeBookingId } } : {}),
          },
        }),
        tx.calendarBlock.count({
          where: {
            organizationId: params.organizationId,
            startAt: { lt: params.endAt },
            endAt: { gt: params.startAt },
            OR: [{ itemId: params.itemId }, { itemId: null }],
          },
        }),
      ]);
      if (overlap + blocked >= Math.max(1, params.itemQuantity)) {
        throw new Error(BOOKING_CONFLICT);
      }
      return params.write(tx);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

/**
 * Vertaalt een throw uit `withBookingConflictGuard` (BOOKING_CONFLICT of een
 * Postgres P2034-serialisatieconflict) naar een nette NL-melding, of null als
 * het geen conflict-fout is (dan moet de caller de fout doorgooien).
 */
export function bookingConflictError(err: unknown): string | null {
  if (err instanceof Error && err.message === BOOKING_CONFLICT) {
    return "Net te laat — dit tijdslot is zojuist geboekt.";
  }
  if (
    err &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code?: string }).code === "P2034"
  ) {
    return "Net te laat — probeer een ander tijdslot.";
  }
  return null;
}
