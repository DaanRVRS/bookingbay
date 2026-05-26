import "server-only";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit/log";
import { addDays, addWeeks, addMonths, startOfDay, setDate, getDaysInMonth } from "date-fns";

/**
 * Materialiseert RecurringBooking-templates in echte Booking-rows. Bewust
 * één-slot-per-run zodat de scheduler niet maandenlang vooruit boekt en
 * een patroon-wijziging weinig wegwerk-rommel achterlaat. De
 * booking-pulse cron belt deze helper één keer per dag aan.
 *
 * Voor elk template waarbij nextRunAt <= now:
 *   1. Bereken het concrete startAt/endAt voor de huidige slot
 *   2. Maak een Booking aan met status CONFIRMED + totalPrice 0 (tenant
 *      kan handmatig prijs aanpassen)
 *   3. Schuif nextRunAt door naar de volgende slot
 *   4. Als endsAt overschreden → zet isActive=false
 */

const MATERIALIZE_LOOKAHEAD_DAYS = 30;

export async function runRecurringMaterialize(): Promise<{
  templatesChecked: number;
  bookingsCreated: number;
  templatesDeactivated: number;
}> {
  const now = new Date();
  const lookAheadCutoff = addDays(now, MATERIALIZE_LOOKAHEAD_DAYS);

  const templates = await db.recurringBooking.findMany({
    where: {
      isActive: true,
      nextRunAt: { lte: lookAheadCutoff },
    },
    select: {
      id: true,
      organizationId: true,
      itemId: true,
      customerId: true,
      frequency: true,
      dayOfWeek: true,
      dayOfMonth: true,
      startTimeMin: true,
      endTimeMin: true,
      nextRunAt: true,
      endsAt: true,
    },
  });

  let bookingsCreated = 0;
  let templatesDeactivated = 0;

  for (const t of templates) {
    // Stop direct als template-window voorbij is.
    if (t.endsAt && t.nextRunAt > t.endsAt) {
      await db.recurringBooking.update({
        where: { id: t.id },
        data: { isActive: false },
      });
      templatesDeactivated++;
      continue;
    }

    const startAt = applyTimeOfDay(t.nextRunAt, t.startTimeMin);
    const endAt = applyTimeOfDay(t.nextRunAt, t.endTimeMin);

    // Niet dubbel-materialiseren — als er al een (niet-geannuleerde)
    // booking is voor dit customer+item+startAt slaan we 'm over en
    // schuiven gewoon nextRunAt door.
    const existing = await db.booking.findFirst({
      where: {
        organizationId: t.organizationId,
        itemId: t.itemId,
        customerId: t.customerId,
        startAt,
        status: { not: "CANCELED" },
      },
      select: { id: true },
    });

    if (!existing) {
      await db.booking.create({
        data: {
          organizationId: t.organizationId,
          itemId: t.itemId,
          customerId: t.customerId,
          startAt,
          endAt,
          status: "CONFIRMED",
          totalPrice: 0,
          notes: `Auto-aangemaakt vanuit terugkerende boeking (${t.id.slice(-6)})`,
        },
      });
      await audit({
        organizationId: t.organizationId,
        action: "booking.recurring.materialized",
        resource: "booking",
        metadata: {
          recurringId: t.id,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
        },
      });
      bookingsCreated++;
    }

    const nextRun = stepNextRun(t.nextRunAt, t.frequency, {
      dayOfWeek: t.dayOfWeek,
      dayOfMonth: t.dayOfMonth,
    });
    const stillActive = !t.endsAt || nextRun <= t.endsAt;

    await db.recurringBooking.update({
      where: { id: t.id },
      data: {
        nextRunAt: nextRun,
        isActive: stillActive,
      },
    });
    if (!stillActive) templatesDeactivated++;
  }

  return {
    templatesChecked: templates.length,
    bookingsCreated,
    templatesDeactivated,
  };
}

function applyTimeOfDay(day: Date, minutesFromMidnight: number): Date {
  const base = startOfDay(day);
  return new Date(base.getTime() + minutesFromMidnight * 60_000);
}

function stepNextRun(
  current: Date,
  frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY",
  pattern: { dayOfWeek: number | null; dayOfMonth: number | null },
): Date {
  if (frequency === "WEEKLY") return addWeeks(current, 1);
  if (frequency === "BIWEEKLY") return addWeeks(current, 2);
  // MONTHLY: ga 1 maand vooruit. Bij dayOfMonth=31 valt 'ie automatisch op
  // de laatste dag van de maand omdat we niet hoger dan getDaysInMonth gaan.
  const next = addMonths(current, 1);
  if (pattern.dayOfMonth != null) {
    const max = getDaysInMonth(next);
    return setDate(next, Math.min(pattern.dayOfMonth, max));
  }
  return next;
}
