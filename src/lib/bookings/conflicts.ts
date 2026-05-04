import { db } from "@/lib/db";

interface ConflictCheckParams {
  organizationId: string;
  itemId: string;
  startAt: Date;
  endAt: Date;
  excludeBookingId?: string;
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
