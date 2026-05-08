"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addDays,
  addWeeks,
  differenceInMinutes,
  format,
  isSameDay,
  isToday,
  parseISO,
  startOfDay,
  subWeeks,
} from "date-fns";
import { nl } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import type { BookingStatus } from "@prisma/client";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/bookings/schemas";
import { moveBookingAction } from "@/lib/bookings/actions";

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

type ViewMode = "week" | "day" | "items";

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

const HOUR_START = 7;
const HOUR_END = 22;
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);
const HOUR_HEIGHT = 56;

const BOOKING_DRAG_PREFIX = "booking__";
const SLOT_DROP_PREFIX = "slot__"; // slot__YYYY-MM-DD__HH (hour bucket within a day)
const CELL_DROP_PREFIX = "cell__"; // cell__<itemId>__YYYY-MM-DD (items grid)

type DropTarget =
  | { kind: "slot"; day: Date; hour: number }
  | { kind: "cell"; itemId: string; day: Date };

function slotDropId(day: Date, hour: number) {
  return `${SLOT_DROP_PREFIX}${format(day, "yyyy-MM-dd")}__${hour}`;
}
function cellDropId(itemId: string, day: Date) {
  return `${CELL_DROP_PREFIX}${itemId}__${format(day, "yyyy-MM-dd")}`;
}
function parseDropTarget(id: string): DropTarget | null {
  if (id.startsWith(SLOT_DROP_PREFIX)) {
    const rest = id.slice(SLOT_DROP_PREFIX.length);
    const [date, hourStr] = rest.split("__");
    const hour = Number(hourStr);
    if (!date || !Number.isFinite(hour)) return null;
    return { kind: "slot", day: parseISO(date), hour };
  }
  if (id.startsWith(CELL_DROP_PREFIX)) {
    const rest = id.slice(CELL_DROP_PREFIX.length);
    const lastSep = rest.lastIndexOf("__");
    if (lastSep === -1) return null;
    const itemId = rest.slice(0, lastSep);
    const date = rest.slice(lastSep + 2);
    if (!itemId || !date) return null;
    return { kind: "cell", itemId, day: parseISO(date) };
  }
  return null;
}

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

  const bookingById = useMemo(() => {
    const map = new Map<string, BookingRow>();
    for (const b of bookings) map.set(b.id, b);
    return map;
  }, [bookings]);

  const [selectedDay, setSelectedDay] = useState<Date>(focused);
  const [view, setView] = useState<ViewMode>("week");
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    // 6px activation distance keeps clicks (no movement) flowing through to
    // the underlying <Link> for navigation.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const goto = (d: Date) => {
    const iso = format(d, "yyyy-MM-dd");
    router.push(`/dashboard/calendar?date=${iso}`);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    if (!activeId.startsWith(BOOKING_DRAG_PREFIX)) return;
    const bookingId = activeId.slice(BOOKING_DRAG_PREFIX.length);
    const booking = bookingById.get(bookingId);
    if (!booking) return;

    const target = parseDropTarget(String(over.id));
    if (!target) return;

    const oldStart = parseISO(booking.startAt);
    let newStart: Date;
    let newItemId: string | undefined;
    if (target.kind === "slot") {
      newStart = new Date(target.day);
      // Keep the original minute precision: a 10:30 booking dropped on the
      // 13:00 slot moves to 13:30.
      newStart.setHours(target.hour, oldStart.getMinutes(), 0, 0);
    } else {
      newStart = new Date(target.day);
      newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);
      newItemId = target.itemId;
    }

    const newStartIso = newStart.toISOString();
    if (
      booking.startAt === newStartIso &&
      (!newItemId || newItemId === booking.itemId)
    ) {
      return;
    }

    startTransition(async () => {
      const res = await moveBookingAction({
        id: bookingId,
        newStartAt: newStartIso,
        newItemId,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Boeking verplaatst");
      router.refresh();
    });
  };

  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Planning</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {view === "day"
              ? format(selectedDay, "EEEE d MMMM yyyy", { locale: nl })
              : `${format(start, "d MMM", { locale: nl })} — ${format(addDays(start, 6), "d MMM yyyy", { locale: nl })}`}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ViewSelector view={view} onChange={setView} />
          <Button
            variant="outline"
            size="icon"
            aria-label="Vorige week"
            onClick={() => goto(subWeeks(start, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" onClick={() => goto(new Date())} className="px-3">
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

      {/* Day strip — also acts as the day picker */}
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
              onClick={() => {
                setSelectedDay(d);
                if (view === "day") goto(d);
              }}
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

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="mt-6">
          {view === "week" && (
            <WeekTimeGrid
              days={days}
              bookings={bookings}
              items={items}
              accentByItemId={accentByItemId}
            />
          )}
          {view === "day" && (
            <DayTimeView
              day={selectedDay}
              bookings={bookings}
              items={items}
              accentByItemId={accentByItemId}
            />
          )}
          {view === "items" && (
            <ItemsGrid
              days={days}
              bookings={bookings}
              items={items}
              accentByItemId={accentByItemId}
              onDayClick={(d) => setSelectedDay(d)}
            />
          )}
        </div>
      </DndContext>

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

function ViewSelector({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  const opts: { id: ViewMode; label: string }[] = [
    { id: "week", label: "Week" },
    { id: "day", label: "Dag" },
    { id: "items", label: "Items" },
  ];
  return (
    <div className="inline-flex rounded-md border border-border bg-card p-0.5 text-sm">
      {opts.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded px-3 py-1 transition-colors",
            view === o.id
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function bookingPosition(start: Date, end: Date, day: Date) {
  const dayStart = startOfDay(day);
  const dayBoundaryStart = new Date(dayStart);
  dayBoundaryStart.setHours(HOUR_START, 0, 0, 0);
  const dayBoundaryEnd = new Date(dayStart);
  dayBoundaryEnd.setHours(HOUR_END + 1, 0, 0, 0);

  const visibleStart = start < dayBoundaryStart ? dayBoundaryStart : start;
  const visibleEnd = end > dayBoundaryEnd ? dayBoundaryEnd : end;

  if (visibleStart >= dayBoundaryEnd || visibleEnd <= dayBoundaryStart) return null;

  const top =
    (differenceInMinutes(visibleStart, dayBoundaryStart) / 60) * HOUR_HEIGHT;
  const height = Math.max(
    24,
    (differenceInMinutes(visibleEnd, visibleStart) / 60) * HOUR_HEIGHT,
  );
  return { top, height };
}

function WeekTimeGrid({
  days,
  bookings,
  items,
  accentByItemId,
}: {
  days: Date[];
  bookings: BookingRow[];
  items: ItemRow[];
  accentByItemId: Map<string, string>;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center text-sm text-muted-foreground">
        Voeg eerst items toe aan je catalogus voor je boekingen kunt plannen.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <div className="min-w-[840px]">
        {/* Header row */}
        <div className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] border-b border-border bg-muted/30 text-xs">
          <div className="px-2 py-2 text-muted-foreground" />
          {days.map((d) => (
            <div
              key={d.toISOString()}
              className={cn(
                "border-l border-border px-2 py-2 text-center",
                isToday(d) ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span className="block text-[10px] font-medium tracking-wide uppercase">
                {format(d, "EEE", { locale: nl })}
              </span>
              <span className="block text-sm font-semibold tabular-nums">
                {format(d, "d")}
              </span>
            </div>
          ))}
        </div>

        {/* Time grid body */}
        <div
          className="relative grid grid-cols-[60px_repeat(7,minmax(0,1fr))]"
          style={{ height: HOURS.length * HOUR_HEIGHT }}
        >
          {/* Hour labels */}
          <div className="relative border-r border-border">
            {HOURS.map((h, i) => (
              <div
                key={h}
                className="absolute right-2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground tabular-nums"
                style={{ top: i * HOUR_HEIGHT }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d) => {
            const dayBookings = bookings.filter((b) => {
              const s = parseISO(b.startAt);
              const e = parseISO(b.endAt);
              return s < addDays(startOfDay(d), 1) && e > startOfDay(d);
            });
            return (
              <div
                key={d.toISOString()}
                className={cn(
                  "relative border-l border-border",
                  isToday(d) && "bg-primary/[0.025]",
                )}
              >
                {/* Hour grid lines + per-hour drop slots */}
                {HOURS.map((h, i) => (
                  <div
                    key={h}
                    className="absolute right-0 left-0 border-t border-border/60"
                    style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                  >
                    <HourSlotDroppable
                      day={d}
                      hour={h}
                      className="inset-0"
                      style={{ height: HOUR_HEIGHT }}
                    />
                  </div>
                ))}
                {/* Booking blocks */}
                {dayBookings.map((b) => {
                  const pos = bookingPosition(
                    parseISO(b.startAt),
                    parseISO(b.endAt),
                    d,
                  );
                  if (!pos) return null;
                  return (
                    <DraggableBooking
                      key={b.id}
                      bookingId={b.id}
                      href={`/dashboard/bookings/${b.id}`}
                      className={cn(
                        "absolute right-1 left-1 flex flex-col gap-0.5 overflow-hidden rounded-md bg-gradient-to-br px-1.5 py-1 text-[10px] font-medium text-white shadow-sm transition-all hover:brightness-110",
                        accentByItemId.get(b.itemId) ?? "from-primary to-primary",
                        b.status === "CANCELED" && "opacity-50 line-through",
                      )}
                      style={{ top: pos.top + 1, height: pos.height - 2 }}
                      title={`${b.itemName} · ${b.customerName} · ${format(parseISO(b.startAt), "HH:mm")}–${format(parseISO(b.endAt), "HH:mm")} — sleep om te verplaatsen`}
                    >
                      <span className="truncate font-semibold">
                        {format(parseISO(b.startAt), "HH:mm")} {b.itemName}
                      </span>
                      <span className="truncate opacity-90">{b.customerName}</span>
                    </DraggableBooking>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DayTimeView({
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
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center text-sm text-muted-foreground">
        Voeg eerst items toe aan je catalogus voor je boekingen kunt plannen.
      </div>
    );
  }

  const dayBookings = bookings
    .filter((b) => {
      const s = parseISO(b.startAt);
      const e = parseISO(b.endAt);
      const dayStart = startOfDay(day);
      const dayEnd = addDays(dayStart, 1);
      return s < dayEnd && e > dayStart;
    })
    .sort(
      (a, b) => parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime(),
    );

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      {/* Time column */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground">
          {format(day, "EEEE d MMMM", { locale: nl })}
          {isToday(day) && (
            <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
              Vandaag
            </span>
          )}
        </div>
        <div
          className="relative grid grid-cols-[60px_1fr]"
          style={{ height: HOURS.length * HOUR_HEIGHT }}
        >
          {/* Hour labels */}
          <div className="relative border-r border-border">
            {HOURS.map((h, i) => (
              <div
                key={h}
                className="absolute right-2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground tabular-nums"
                style={{ top: i * HOUR_HEIGHT }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {/* Booking column */}
          <div className="relative">
            {HOURS.map((h, i) => (
              <div
                key={h}
                className="absolute right-0 left-0 border-t border-border/60"
                style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
              >
                <HourSlotDroppable
                  day={day}
                  hour={h}
                  className="inset-0"
                  style={{ height: HOUR_HEIGHT }}
                />
              </div>
            ))}
            {dayBookings.map((b) => {
              const pos = bookingPosition(
                parseISO(b.startAt),
                parseISO(b.endAt),
                day,
              );
              if (!pos) return null;
              return (
                <DraggableBooking
                  key={b.id}
                  bookingId={b.id}
                  href={`/dashboard/bookings/${b.id}`}
                  className={cn(
                    "absolute right-2 left-2 flex flex-col gap-0.5 overflow-hidden rounded-md bg-gradient-to-br px-3 py-2 text-xs font-medium text-white shadow-sm transition-all hover:brightness-110",
                    accentByItemId.get(b.itemId) ?? "from-primary to-primary",
                    b.status === "CANCELED" && "opacity-50 line-through",
                  )}
                  style={{ top: pos.top + 1, height: pos.height - 2 }}
                  title="Sleep om te verplaatsen"
                >
                  <span className="truncate text-[11px] font-semibold opacity-95">
                    {format(parseISO(b.startAt), "HH:mm")} –{" "}
                    {format(parseISO(b.endAt), "HH:mm")}
                  </span>
                  <span className="truncate text-sm font-semibold">{b.itemName}</span>
                  <span className="truncate opacity-90">{b.customerName}</span>
                </DraggableBooking>
              );
            })}
          </div>
        </div>
      </div>

      {/* Side list */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between pb-3">
          <h3 className="text-sm font-semibold">Boekingen vandaag</h3>
          <span className="text-xs text-muted-foreground">
            {dayBookings.length}{" "}
            {dayBookings.length === 1 ? "boeking" : "boekingen"}
          </span>
        </div>
        {dayBookings.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-background/50 px-4 py-8 text-center text-xs text-muted-foreground">
            Geen boekingen op deze dag.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {dayBookings.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/dashboard/bookings/${b.id}`}
                  className="group relative flex items-center gap-3 overflow-hidden rounded-lg border border-border bg-background p-2.5 pl-3.5 transition-shadow hover:shadow-sm"
                >
                  <div
                    className={cn(
                      "absolute top-0 bottom-0 left-0 w-[3px] bg-gradient-to-b",
                      accentByItemId.get(b.itemId) ?? "from-primary to-primary/60",
                    )}
                  />
                  <div className="flex shrink-0 flex-col">
                    <span className="text-[11px] font-semibold leading-tight tabular-nums">
                      {format(parseISO(b.startAt), "HH:mm")}
                    </span>
                    <span className="text-[10px] leading-tight text-muted-foreground">
                      tot {format(parseISO(b.endAt), "HH:mm")}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium">{b.itemName}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {b.customerName}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium",
                      statusStyles[b.status],
                    )}
                  >
                    {STATUS_LABELS[b.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ItemsGrid({
  days,
  bookings,
  items,
  accentByItemId,
  onDayClick,
}: {
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

  const segmentsByItem: Record<
    string,
    {
      bookingId: string;
      customerName: string;
      status: BookingStatus;
      startDayIndex: number;
      endDayIndex: number;
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
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <div className="min-w-[760px]">
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
            <span className="block text-sm font-semibold tabular-nums">
              {format(d, "d")}
            </span>
          </button>
        ))}
      </div>

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
              {days.map((d) => (
                <CellDroppable key={d.toISOString()} itemId={item.id} day={d}>
                  <Link
                    href={`/dashboard/bookings/new?item=${item.id}&start=${format(d, "yyyy-MM-dd")}`}
                    className="block size-full"
                    aria-label={`Nieuwe boeking ${item.name} op ${format(d, "d MMM", { locale: nl })}`}
                  />
                </CellDroppable>
              ))}
              <div className="pointer-events-none absolute inset-y-1 left-[180px] right-0 flex flex-col justify-start gap-1 px-1">
                {segs.map((seg) => {
                  const cols = seg.endDayIndex - seg.startDayIndex + 1;
                  const left = `calc(${(seg.startDayIndex / 7) * 100}% + 2px)`;
                  const width = `calc(${(cols / 7) * 100}% - 4px)`;
                  return (
                    <DraggableBooking
                      key={seg.bookingId}
                      bookingId={seg.bookingId}
                      href={`/dashboard/bookings/${seg.bookingId}`}
                      className={`pointer-events-auto absolute flex items-center gap-1.5 truncate rounded-md bg-gradient-to-r ${
                        accentByItemId.get(item.id) ?? "from-primary to-primary"
                      } px-2 py-1 text-[11px] font-medium text-white shadow-sm transition-all hover:brightness-110 ${
                        seg.status === "CANCELED" ? "opacity-50 line-through" : ""
                      }`}
                      style={{ left, width, top: 4, height: "calc(100% - 8px)" }}
                      title={`${seg.customerName} · ${seg.startTime} – ${seg.endTime} — sleep om te verplaatsen`}
                    >
                      <span className="truncate">{seg.customerName}</span>
                      <span className="ml-auto shrink-0 opacity-80">{seg.startTime}</span>
                    </DraggableBooking>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Drag-and-drop helpers                                               */
/* ------------------------------------------------------------------ */

function DraggableBooking({
  bookingId,
  children,
  href,
  className,
  style,
  title,
}: {
  bookingId: string;
  children: React.ReactNode;
  href: string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: `${BOOKING_DRAG_PREFIX}${bookingId}` });

  // Track whether a drag actually occurred during this press. dnd-kit clears
  // isDragging before the synthetic click event fires after pointerup, so
  // checking isDragging in onClick is too late — the Link already navigated.
  const wasDragRef = useRef(false);
  useEffect(() => {
    if (isDragging) wasDragRef.current = true;
  }, [isDragging]);

  const dragStyle: React.CSSProperties = {
    ...style,
    transform: CSS.Translate.toString(transform),
    cursor: "grab",
    zIndex: isDragging ? 30 : undefined,
    opacity: isDragging ? 0.8 : undefined,
  };

  return (
    <Link
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      href={href}
      className={cn(className, "touch-none select-none active:cursor-grabbing")}
      style={dragStyle}
      title={title}
      onClick={(e) => {
        if (isDragging || wasDragRef.current) {
          e.preventDefault();
          wasDragRef.current = false;
        }
      }}
    >
      {children}
    </Link>
  );
}

function HourSlotDroppable({
  day,
  hour,
  className,
  style,
}: {
  day: Date;
  hour: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: slotDropId(day, hour) });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute right-0 left-0 transition-colors",
        isOver && "bg-primary/15 ring-1 ring-inset ring-primary/40",
        className,
      )}
      style={style}
      aria-hidden
    />
  );
}

function CellDroppable({
  itemId,
  day,
  children,
}: {
  itemId: string;
  day: Date;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: cellDropId(itemId, day) });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "border-l border-border transition-colors",
        isOver ? "bg-primary/15" : "hover:bg-accent/40",
      )}
    >
      {children}
    </div>
  );
}

