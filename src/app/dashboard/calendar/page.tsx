import { addDays, endOfWeek, format, parseISO, startOfWeek } from "date-fns";
import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { safeParseBusinessHours } from "@/lib/business-hours/schemas";
import { CalendarView } from "./calendar-view";

export const metadata = { title: "Planning" };

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

// Fallback wanneer er geen openingstijden of boekingen zijn.
const FALLBACK_START_HOUR = 8;
const FALLBACK_END_HOUR = 19; // inclusief laatste label; onderrand = 20:00
const MIN_SPAN_HOURS = 6;

function hhmmToMin(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/**
 * Bepaal het zichtbare tijdvenster van het rooster: strak om de werkdag i.p.v.
 * altijd 07:00–23:00. Basis = de openingstijden (stabiel per week); daarna
 * uitrekken voor tijd-boekingen die buiten die uren vallen. Hele-dag-verhuur
 * (00:00–23:59, bv. boten per dag) wordt genegeerd zodat die het venster niet
 * naar 0–24 opblaast.
 */
function computeHourWindow(
  businessHours: unknown,
  bookings: { startAt: Date; endAt: Date }[],
): { hourStart: number; hourEnd: number } {
  let minOpen = Infinity;
  let maxClose = -Infinity;

  const hours = safeParseBusinessHours(businessHours);
  if (hours) {
    for (const d of hours) {
      if (d.closed) continue;
      const o = hhmmToMin(d.open || "09:00");
      const c = hhmmToMin(d.close || "17:00");
      if (o != null) minOpen = Math.min(minOpen, o);
      if (c != null) maxClose = Math.max(maxClose, c);
    }
  }

  const WHOLE_DAY_MIN = 20 * 60; // ≥20u = hele-dag/week-verhuur → overslaan
  for (const b of bookings) {
    const startMin = b.startAt.getHours() * 60 + b.startAt.getMinutes();
    const endAbs = (b.endAt.getTime() - startOfLocalDay(b.startAt)) / 60000;
    if (endAbs - startMin >= WHOLE_DAY_MIN) continue;
    minOpen = Math.min(minOpen, startMin);
    maxClose = Math.max(maxClose, endAbs);
  }

  if (!Number.isFinite(minOpen) || !Number.isFinite(maxClose)) {
    return { hourStart: FALLBACK_START_HOUR, hourEnd: FALLBACK_END_HOUR };
  }

  let hourStart = Math.max(0, Math.floor(minOpen / 60));
  let endExclusive = Math.min(24, Math.ceil(maxClose / 60));
  // Minimale hoogte zodat een korte werkdag niet als sliver oogt.
  if (endExclusive - hourStart < MIN_SPAN_HOURS) {
    endExclusive = Math.min(24, hourStart + MIN_SPAN_HOURS);
    hourStart = Math.max(0, endExclusive - MIN_SPAN_HOURS);
  }
  return { hourStart, hourEnd: endExclusive - 1 };
}

function startOfLocalDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export default async function CalendarPage({ searchParams }: PageProps) {
  const ctx = await requireOrg();
  const params = await searchParams;
  const orgId = ctx.organization.id;

  const dateParam = params.date;
  const focused = dateParam ? safeParseDate(dateParam) : new Date();
  const weekStart = startOfWeek(focused, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(focused, { weekStartsOn: 1 });

  const [org, items, bookings] = await Promise.all([
    db.organization.findUnique({
      where: { id: orgId },
      select: { businessHours: true },
    }),
    db.item.findMany({
      where: { organizationId: orgId, isActive: true, isAddon: false },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        quantity: true,
        categoryId: true,
        category: { select: { name: true } },
      },
    }),
    db.booking.findMany({
      where: {
        organizationId: orgId,
        startAt: { lt: addDays(weekEnd, 1) },
        endAt: { gt: weekStart },
        status: { not: "CANCELED" },
      },
      include: {
        item: { select: { id: true, name: true } },
        customer: { select: { name: true } },
      },
      orderBy: { startAt: "asc" },
    }),
  ]);

  const { hourStart, hourEnd } = computeHourWindow(
    org?.businessHours,
    bookings.map((b) => ({ startAt: b.startAt, endAt: b.endAt })),
  );

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <CalendarView
          focusedDate={format(focused, "yyyy-MM-dd")}
          weekStart={format(weekStart, "yyyy-MM-dd")}
          hourStart={hourStart}
          hourEnd={hourEnd}
          items={items.map((i) => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity,
            categoryId: i.categoryId,
            categoryName: i.category.name,
          }))}
          bookings={bookings.map((b) => ({
            id: b.id,
            itemId: b.itemId,
            itemName: b.item.name,
            customerName: b.customer.name,
            startAt: b.startAt.toISOString(),
            endAt: b.endAt.toISOString(),
            status: b.status,
            totalPrice: b.totalPrice.toString(),
          }))}
        />
      </div>
    </div>
  );
}

function safeParseDate(s: string): Date {
  try {
    const d = parseISO(s);
    if (Number.isNaN(d.getTime())) return new Date();
    return d;
  } catch {
    return new Date();
  }
}
