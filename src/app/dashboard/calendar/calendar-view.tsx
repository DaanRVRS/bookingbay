"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addDays,
  addWeeks,
  format,
  isSameDay,
  isToday,
  parseISO,
  startOfDay,
  subWeeks,
} from "date-fns";
import { nl } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { BookingStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS } from "@/lib/bookings/schemas";

interface ItemRow {
  id: string;
  name: string;
  quantity: number;
}

interface BookingRow {
  id: string;
  itemId: string;
  itemName: string;
  customerName: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  totalPrice: string;
}

interface Props {
  focusedDate: string;
  weekStart: string;
  items: ItemRow[];
  bookings: BookingRow[];
}

const itemAccents = [
  "from-primary to-[oklch(0.55_0.18_18)]",
  "from-[oklch(0.55_0.13_200)] to-[oklch(0.45_0.15_220)]",
  "from-[oklch(0.7_0.15_160)] to-[oklch(0.55_0.16_180)]",
  "from-[oklch(0.65_0.16_280)] to-[oklch(0.5_0.18_270)]",
  "from-[oklch(0.7_0.14_60)] to-[oklch(0.55_0.16_50)]",
  "from-[oklch(0.6_0.14_340)] to-[oklch(0.5_0.17_320)]",
];

const statusStyles: Record<BookingStatus, string> = {
  PENDING: "bg-[oklch(0.85_0.13_85)]/25 text-[oklch(0.45_0.13_70)]",
  CONFIRMED: "bg-primary/15 text-primary",
  IN_PROGRESS: "bg-[oklch(0.7_0.13_150)]/20 text-[oklch(0.5_0.14_150)]",
  COMPLETED: "bg-muted text-muted-foreground",
  CANCELED: "bg-destructive/15 text-destructive line-through",
};

export function CalendarView({ focusedDate, weekStart, items, bookings }: Props) {
  const router = useRouter();
  const focused = parseISO(focusedDate);
  const start = parseISO(weekStart);
  const days = useMemo(
    () => Array.from({ length: 7 }).map((_, i) => addDays(start, i)),
    [start],
  );

  const accentByItemId = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((it, i) => map.set(it.id, itemAccents[i % itemAccents.length]));
    return map;
  }, [items]);

  const [selectedDay, setSelectedDay] = useState<Date>(focused);

  const goto = (d: Date) => {
    const iso = format(d, "yyyy-MM-dd");
    router.push(`/dashboard/calendar?date=${iso}`);
  };

  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Planning</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {format(start, "d MMM", { locale: nl })} —{" "}
            {format(addDays(start, 6), "d MMM yyyy", { locale: nl })}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Vorige week"
            onClick={() => goto(subWeeks(start, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => goto(new Date())}
            className="px-3"
          >
            Vandaag
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Volgende week"
            onClick={() => goto(addWeeks(start, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Link
            href={`/dashboard/bookings/new?start=${format(selectedDay, "yyyy-MM-dd")}`}
            className="hidden h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 sm:inline-flex"
          >
            <Plus className="size-4" />
            Boeking
          </Link>
        </div>
      </div>

      {/* Day strip — also acts as the day picker on mobile */}
      <div className="mt-5 grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const isSelected = isSameDay(d, selectedDay);
          const today = isToday(d);
          const dayBookings = bookings.filter(
            (b) => isSameDay(parseISO(b.startAt), d) || isSameDay(parseISO(b.endAt), d),
          );
          return (
            <button
              key={d.toISOString()}
              onClick={() => setSelectedDay(d)}
              className={`group relative flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-xs transition-colors ${
                isSelected
                  ? "border-primary/40 bg-primary/8 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent"
              }`}
            >
              <span className="text-[10px] font-medium tracking-wide uppercase">
                {format(d, "EEE", { locale: nl })}
              </span>
              <span
                className={`text-base font-semibold tabular-nums ${
                  today ? "text-primary" : ""
                }`}
              >
                {format(d, "d")}
              </span>
              {dayBookings.length > 0 && (
                <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-primary/15 text-[9px] font-semibold text-primary">
                  {dayBookings.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile / day-list view */}
      <div className="mt-6 lg:hidden">
        <DayList
          day={selectedDay}
          bookings={bookings}
          items={items}
          accentByItemId={accentByItemId}
        />
      </div>

      {/* Desktop / week-grid view */}
      <div className="mt-6 hidden lg:block">
        <WeekGrid
          start={start}
          days={days}
          bookings={bookings}
          items={items}
          accentByItemId={accentByItemId}
          onDayClick={(d) => setSelectedDay(d)}
        />
      </div>

      {/* Mobile floating new-booking button */}
      <Link
        href={`/dashboard/bookings/new?start=${format(selectedDay, "yyyy-MM-dd")}`}
        className="fixed right-4 bottom-4 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-lg sm:hidden"
      >
        <Plus className="size-4" />
        Boeking
      </Link>
    </div>
  );
}

function DayList({
  day,
  bookings,
  items,
  accentByItemId,
}: {
  day: Date;
  bookings: BookingRow[];
  items: ItemRow[];
  accentByItemId: Map<string, string>;
}) {
  const dayBookings = bookings
    .filter((b) => {
      const s = parseISO(b.startAt);
      const e = parseISO(b.endAt);
      const dayStart = startOfDay(day);
      const dayEnd = addDays(dayStart, 1);
      return s < dayEnd && e > dayStart;
    })
    .sort((a, b) => parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime());

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center text-sm text-muted-foreground">
        Voeg eerst items toe aan je catalogus voor je boekingen kunt plannen.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold tracking-tight">
        {format(day, "EEEE d MMMM", { locale: nl })}
      </h2>
      {dayBookings.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-10 text-center text-sm text-muted-foreground">
          Geen boekingen op deze dag.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {dayBookings.map((b) => (
            <li key={b.id}>
              <Link
                href={`/dashboard/bookings/${b.id}`}
                className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-card p-3 pl-4 transition-shadow hover:shadow-sm"
              >
                <div
                  className={`absolute top-0 bottom-0 left-0 w-[3px] bg-gradient-to-b ${
                    accentByItemId.get(b.itemId) ?? "from-primary to-primary/60"
                  }`}
                />
                <div className="flex shrink-0 flex-col">
                  <span className="text-[12px] font-semibold leading-tight tabular-nums">
                    {format(parseISO(b.startAt), "HH:mm")}
                  </span>
                  <span className="text-[10px] leading-tight text-muted-foreground">
                    tot {format(parseISO(b.endAt), "HH:mm")}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{b.itemName}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{b.customerName}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyles[b.status]}`}
                >
                  {STATUS_LABELS[b.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WeekGrid({
  start,
  days,
  bookings,
  items,
  accentByItemId,
  onDayClick,
}: {
  start: Date;
  days: Date[];
  bookings: BookingRow[];
  items: ItemRow[];
  accentByItemId: Map<string, string>;
  onDayClick: (d: Date) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Voeg eerst items toe aan je catalogus voor je boekingen kunt plannen.
        </p>
      </div>
    );
  }

  // Map: itemId → array of booking-segments per day index
  // For each booking compute which day-cells it spans.
  const segmentsByItem: Record<
    string,
    {
      bookingId: string;
      customerName: string;
      status: BookingStatus;
      startDayIndex: number;
      endDayIndex: number; // inclusive
      startTime: string;
      endTime: string;
    }[]
  > = {};

  for (const b of bookings) {
    const startD = parseISO(b.startAt);
    const endD = parseISO(b.endAt);
    let firstIdx = -1;
    let lastIdx = -1;
    for (let i = 0; i < 7; i++) {
      const dayStart = startOfDay(days[i]);
      const dayEnd = addDays(dayStart, 1);
      if (startD < dayEnd && endD > dayStart) {
        if (firstIdx === -1) firstIdx = i;
        lastIdx = i;
      }
    }
    if (firstIdx === -1) continue;
    segmentsByItem[b.itemId] = segmentsByItem[b.itemId] ?? [];
    segmentsByItem[b.itemId].push({
      bookingId: b.id,
      customerName: b.customerName,
      status: b.status,
      startDayIndex: firstIdx,
      endDayIndex: lastIdx,
      startTime: format(startD, "HH:mm"),
      endTime: format(endD, "HH:mm"),
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Day header */}
      <div className="grid grid-cols-[180px_repeat(7,minmax(0,1fr))] border-b border-border bg-muted/30 text-xs">
        <div className="px-4 py-2 font-semibold text-muted-foreground">Item</div>
        {days.map((d) => (
          <button
            key={d.toISOString()}
            onClick={() => onDayClick(d)}
            className={`px-2 py-2 text-center transition-colors hover:bg-accent ${
              isToday(d) ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <span className="block text-[10px] font-medium tracking-wide uppercase">
              {format(d, "EEE", { locale: nl })}
            </span>
            <span className="block text-sm font-semibold tabular-nums">{format(d, "d")}</span>
          </button>
        ))}
      </div>

      {/* Item rows */}
      <ul>
        {items.map((item) => {
          const segs = segmentsByItem[item.id] ?? [];
          return (
            <li
              key={item.id}
              className="relative grid grid-cols-[180px_repeat(7,minmax(0,1fr))] border-b border-border last:border-b-0"
              style={{ minHeight: "56px" }}
            >
              <div className="flex items-center gap-2 px-4 py-2 text-sm">
                <span
                  className={`size-2 shrink-0 rounded-full bg-gradient-to-br ${
                    accentByItemId.get(item.id) ?? "from-primary to-primary"
                  }`}
                />
                <span className="truncate font-medium">{item.name}</span>
              </div>
              {/* Background empty cells (clickable) */}
              {days.map((d) => (
                <Link
                  key={d.toISOString()}
                  href={`/dashboard/bookings/new?item=${item.id}&start=${format(d, "yyyy-MM-dd")}`}
                  className="border-l border-border transition-colors hover:bg-accent/40"
                  aria-label={`Nieuwe boeking ${item.name} op ${format(d, "d MMM", { locale: nl })}`}
                />
              ))}
              {/* Booking segments overlaid */}
              <div className="pointer-events-none absolute inset-y-1 left-[180px] right-0 flex flex-col justify-start gap-1 px-1">
                {segs.map((seg) => {
                  const cols = seg.endDayIndex - seg.startDayIndex + 1;
                  const left = `calc(${(seg.startDayIndex / 7) * 100}% + 2px)`;
                  const width = `calc(${(cols / 7) * 100}% - 4px)`;
                  return (
                    <Link
                      key={seg.bookingId}
                      href={`/dashboard/bookings/${seg.bookingId}`}
                      className={`pointer-events-auto absolute flex items-center gap-1.5 truncate rounded-md bg-gradient-to-r ${
                        accentByItemId.get(item.id) ?? "from-primary to-primary"
                      } px-2 py-1 text-[11px] font-medium text-white shadow-sm transition-all hover:brightness-110 ${
                        seg.status === "CANCELED" ? "opacity-50 line-through" : ""
                      }`}
                      style={{ left, width, top: 4, height: "calc(100% - 8px)" }}
                      title={`${seg.customerName} · ${seg.startTime} – ${seg.endTime}`}
                    >
                      <span className="truncate">{seg.customerName}</span>
                      <span className="ml-auto shrink-0 opacity-80">{seg.startTime}</span>
                    </Link>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
