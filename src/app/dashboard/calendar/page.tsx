import { addDays, endOfWeek, format, parseISO, startOfWeek } from "date-fns";
import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { CalendarView } from "./calendar-view";

export const metadata = { title: "Planning" };

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function CalendarPage({ searchParams }: PageProps) {
  const ctx = await requireOrg();
  const params = await searchParams;
  const orgId = ctx.organization.id;

  const dateParam = params.date;
  const focused = dateParam ? safeParseDate(dateParam) : new Date();
  const weekStart = startOfWeek(focused, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(focused, { weekStartsOn: 1 });

  const [items, bookings] = await Promise.all([
    db.item.findMany({
      where: { organizationId: orgId, isActive: true, isAddon: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true, quantity: true },
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

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <CalendarView
          focusedDate={format(focused, "yyyy-MM-dd")}
          weekStart={format(weekStart, "yyyy-MM-dd")}
          items={items}
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
