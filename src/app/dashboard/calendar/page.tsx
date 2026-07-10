import { addDays, endOfWeek, format, parseISO, startOfWeek } from "date-fns";
import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { safeParseBusinessHours } from "@/lib/business-hours/schemas";
import { CalendarView } from "./calendar-view";

export const metadata = { title: "Planning" };

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

function hhmmToMin(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/**
 * Zichtbaar venster op basis van de openingstijden (voor de "Openingstijden"-
 * toggle in de kalender). Neemt de vroegste open- en laatste sluit-tijd over
 * alle open dagen. Fallback 08:00–20:00 als er geen uren zijn ingesteld.
 * hourEnd = laatste uur-label; onderrand = hourEnd + 1.
 */
function businessHourWindow(businessHours: unknown): {
  hourStart: number;
  hourEnd: number;
} {
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
  if (!Number.isFinite(minOpen) || !Number.isFinite(maxClose)) {
    return { hourStart: 8, hourEnd: 19 };
  }
  const hourStart = Math.max(0, Math.floor(minOpen / 60));
  const endExclusive = Math.min(24, Math.ceil(maxClose / 60));
  return { hourStart, hourEnd: Math.max(hourStart, endExclusive - 1) };
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

  const business = businessHourWindow(org?.businessHours);

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <CalendarView
          focusedDate={format(focused, "yyyy-MM-dd")}
          weekStart={format(weekStart, "yyyy-MM-dd")}
          businessHourStart={business.hourStart}
          businessHourEnd={business.hourEnd}
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
