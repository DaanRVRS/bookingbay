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
import { ChevronLeft, ChevronRight, ListFilter, Plus, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { BookingStatus } from "@prisma/client";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  type Modifier,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deriveBookingStatus } from "@/lib/bookings/status";
import { moveBookingAction } from "@/lib/bookings/actions";

interface ItemRow {
  id: string;
  name: string;
  quantity: number;
  categoryId: string;
  categoryName: string;
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
  /** Zichtbaar tijdvenster (uren), afgeleid uit openingstijden + boekingen. */
  hourStart?: number;
  hourEnd?: number;
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

// Fallback-venster wanneer er geen openingstijden/boekingen zijn om uit af te
// leiden. Het echte zichtbare venster komt via props (hourStart/hourEnd),
// berekend uit de openingstijden + de boekingen van de week — zodat het
// rooster strak om de werkdag past i.p.v. altijd 07:00–23:00 te tonen.
const DEFAULT_HOUR_START = 8;
const DEFAULT_HOUR_END = 19;
// Slepen snapt op kwartieren — fijn genoeg voor echte planningen, grof
// genoeg om moeiteloos te raken.
const SNAP_MIN = 15;
/** Uur-labels van start t/m end (inclusief). */
function hoursRange(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
const HOUR_HEIGHT = 56;
const SNAP_PX = HOUR_HEIGHT * (SNAP_MIN / 60); // 14px per kwartier

/**
 * Snap de verticale beweging van de drag-overlay op kwartier-hoogtes, zodat
 * het blok voelbaar "klikt" op de tijden waarop je ook echt kunt landen.
 * Horizontaal blijft vrij (dag-kolommen hebben variabele breedtes).
 */
const snapVertical: Modifier = ({ transform }) => ({
  ...transform,
  y: Math.round(transform.y / SNAP_PX) * SNAP_PX,
});

/** Waar de sleep zou landen — voor de ghost-indicator + tijd-label. */
interface DropHint {
  dayKey: string; // yyyy-MM-dd van de doelkolom
  top: number;
  height: number;
  label: string; // "10:15 – 12:15"
}

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

export function CalendarView({
  focusedDate,
  weekStart,
  items,
  bookings,
  hourStart = DEFAULT_HOUR_START,
  hourEnd = DEFAULT_HOUR_END,
}: Props) {
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

  // Optimistic verplaatsingen: het blok staat direct op z'n nieuwe plek,
  // de server bevestigt op de achtergrond. Bij een fout draaien we terug.
  const [optimistic, setOptimistic] = useState<
    Map<string, { startAt: string; endAt: string; itemId: string }>
  >(new Map());

  // Zodra de server-props de verplaatsing bevestigen, mag de optimistic
  // entry weg (match-aware, zodat een tweede sleep niet terugflitst).
  // "Adjust state during render"-patroon i.p.v. een effect — geen extra
  // render-cascade, en de pruning gebeurt exact op het moment dat er
  // nieuwe props binnenkomen.
  const [prunedFor, setPrunedFor] = useState(bookings);
  if (prunedFor !== bookings) {
    setPrunedFor(bookings);
    if (optimistic.size > 0) {
      const next = new Map(optimistic);
      for (const b of bookings) {
        const opt = next.get(b.id);
        if (opt && b.startAt === opt.startAt && b.itemId === opt.itemId) {
          next.delete(b.id);
        }
      }
      if (next.size !== optimistic.size) setOptimistic(next);
    }
  }

  const effectiveBookings = useMemo(() => {
    if (optimistic.size === 0) return bookings;
    return bookings.map((b) => {
      const opt = optimistic.get(b.id);
      return opt ? { ...b, ...opt } : b;
    });
  }, [bookings, optimistic]);

  const bookingById = useMemo(() => {
    const map = new Map<string, BookingRow>();
    for (const b of effectiveBookings) map.set(b.id, b);
    return map;
  }, [effectiveBookings]);

  const [selectedDay, setSelectedDay] = useState<Date>(focused);
  const [view, setView] = useState<ViewMode>("week");
  const [, startTransition] = useTransition();

  // Filters: categorie en/of item. "all" = geen filter. De accent-kleuren
  // blijven op de vólledige items-lijst gebaseerd zodat kleuren niet
  // verspringen bij het filteren.
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [itemFilter, setItemFilter] = useState<string>("all");

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const it of items) {
      if (!map.has(it.categoryId)) map.set(it.categoryId, it.categoryName);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "nl"));
  }, [items]);

  const filterableItems = useMemo(
    () =>
      categoryFilter === "all"
        ? items
        : items.filter((i) => i.categoryId === categoryFilter),
    [items, categoryFilter],
  );

  const visibleItems = useMemo(
    () =>
      itemFilter === "all"
        ? filterableItems
        : filterableItems.filter((i) => i.id === itemFilter),
    [filterableItems, itemFilter],
  );

  const visibleBookings = useMemo(() => {
    if (categoryFilter === "all" && itemFilter === "all") return effectiveBookings;
    const ids = new Set(visibleItems.map((i) => i.id));
    return effectiveBookings.filter((b) => ids.has(b.itemId));
  }, [effectiveBookings, visibleItems, categoryFilter, itemFilter]);

  const filterActive = categoryFilter !== "all" || itemFilter !== "all";

  const sensors = useSensors(
    // 6px activation distance: bewegingen onder die threshold tellen niet
    // als drag → onClick op de booking-card navigeert naar de edit-page.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const goto = (d: Date) => {
    const iso = format(d, "yyyy-MM-dd");
    router.push(`/dashboard/calendar?date=${iso}`);
  };

  // Actieve sleep + landings-hint (ghost-blok met tijd-label).
  const [dragging, setDragging] = useState<{
    booking: BookingRow;
    width: number;
    height: number;
  } | null>(null);
  const [dropHint, setDropHint] = useState<DropHint | null>(null);

  /**
   * Bereken de landing van een tijd-sleep: de verticale delta (gesnapt op
   * kwartieren door de modifier) verschuift de starttijd; de kolom waar je
   * boven hangt bepaalt de dag. Duur blijft altijd behouden.
   */
  const computeSlotDrop = (
    booking: BookingRow,
    targetDay: Date,
    deltaY: number,
  ) => {
    const oldStart = parseISO(booking.startAt);
    const oldEnd = parseISO(booking.endAt);
    const durationMin = differenceInMinutes(oldEnd, oldStart);
    const deltaMin = Math.round(deltaY / SNAP_PX) * SNAP_MIN;
    const startOfDayMin = oldStart.getHours() * 60 + oldStart.getMinutes();
    const newMin = Math.min(
      Math.max(startOfDayMin + deltaMin, hourStart * 60),
      (hourEnd + 1) * 60 - SNAP_MIN,
    );
    const newStart = new Date(targetDay);
    newStart.setHours(Math.floor(newMin / 60), newMin % 60, 0, 0);
    const newEnd = new Date(newStart.getTime() + durationMin * 60_000);
    return { newStart, newEnd, durationMin, newMin };
  };

  const activeBookingFromEvent = (event: { active: { id: string | number } }) => {
    const activeId = String(event.active.id);
    if (!activeId.startsWith(BOOKING_DRAG_PREFIX)) return null;
    return bookingById.get(activeId.slice(BOOKING_DRAG_PREFIX.length)) ?? null;
  };

  const onDragStart = (event: DragStartEvent) => {
    const booking = activeBookingFromEvent(event);
    if (!booking) return;
    const rect = event.active.rect.current.initial;
    setDragging({
      booking,
      width: rect?.width ?? 140,
      height: rect?.height ?? 40,
    });
  };

  const onDragMove = (event: DragMoveEvent) => {
    if (!dragging) return;
    const { over, delta } = event;
    if (!over) {
      setDropHint(null);
      return;
    }
    const target = parseDropTarget(String(over.id));
    if (!target || target.kind !== "slot") {
      setDropHint(null);
      return;
    }
    const { newStart, newEnd, durationMin, newMin } = computeSlotDrop(
      dragging.booking,
      target.day,
      delta.y,
    );
    const top = ((newMin - hourStart * 60) / 60) * HOUR_HEIGHT;
    const height = Math.max(22, (durationMin / 60) * HOUR_HEIGHT);
    setDropHint({
      dayKey: format(target.day, "yyyy-MM-dd"),
      top,
      height,
      label: `${format(newStart, "HH:mm")} – ${format(newEnd, "HH:mm")}`,
    });
  };

  const onDragCancel = () => {
    setDragging(null);
    setDropHint(null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const booking = activeBookingFromEvent({ active });
    setDragging(null);
    setDropHint(null);
    if (!over || !booking) return;

    const target = parseDropTarget(String(over.id));
    if (!target) return;

    let newStart: Date;
    let newItemId: string | undefined;
    if (target.kind === "slot") {
      newStart = computeSlotDrop(booking, target.day, event.delta.y).newStart;
    } else {
      const oldStart = parseISO(booking.startAt);
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

    // Optimistic: blok staat meteen op de nieuwe plek.
    const durationMs =
      parseISO(booking.endAt).getTime() - parseISO(booking.startAt).getTime();
    const optimisticEntry = {
      startAt: newStartIso,
      endAt: new Date(newStart.getTime() + durationMs).toISOString(),
      itemId: newItemId ?? booking.itemId,
    };
    const bookingId = booking.id;
    const previous = optimistic.get(bookingId) ?? null;
    setOptimistic((prev) => new Map(prev).set(bookingId, optimisticEntry));

    startTransition(async () => {
      const res = await moveBookingAction({
        id: bookingId,
        newStartAt: newStartIso,
        newItemId,
      });
      if (!res.ok) {
        // Terugdraaien naar de vorige (optimistic of server-) positie.
        setOptimistic((prev) => {
          const next = new Map(prev);
          if (previous) next.set(bookingId, previous);
          else next.delete(bookingId);
          return next;
        });
        toast.error(res.error);
        return;
      }
      toast.success(
        `Verplaatst naar ${format(newStart, "EEE d MMM HH:mm", { locale: nl })}`,
      );
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

      {/* Filters: categorie + item */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <ListFilter className="size-3.5" />
          Filter
        </span>
        <Select
          items={[
            { value: "all", label: "Alle categorieën" },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
          value={categoryFilter}
          onValueChange={(v) => {
            const next = v ?? "all";
            setCategoryFilter(next);
            // Item-filter resetten als het item niet in de nieuwe categorie zit.
            if (
              next !== "all" &&
              itemFilter !== "all" &&
              !items.some((i) => i.id === itemFilter && i.categoryId === next)
            ) {
              setItemFilter("all");
            }
          }}
        >
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="Alle categorieën" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle categorieën</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={[
            { value: "all", label: "Alle items" },
            ...filterableItems.map((i) => ({ value: i.id, label: i.name })),
          ]}
          value={itemFilter}
          onValueChange={(v) => setItemFilter(v ?? "all")}
        >
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="Alle items" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle items</SelectItem>
            {filterableItems.map((i) => (
              <SelectItem key={i.id} value={i.id}>
                {i.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filterActive && (
          <button
            type="button"
            onClick={() => {
              setCategoryFilter("all");
              setItemFilter("all");
            }}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/15"
          >
            <X className="size-3" />
            {visibleBookings.length}{" "}
            {visibleBookings.length === 1 ? "boeking" : "boekingen"} — wis filter
          </button>
        )}
      </div>

      {/* Dag-kiezer: alleen in de Dag-weergave zinvol — de Items-weergave
          heeft z'n eigen klikbare dag-koppen in de grid. */}
      {view === "day" && (
        <div className="mt-5 grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const isSelected = isSameDay(d, selectedDay);
            const today = isToday(d);
            const dayBookings = visibleBookings.filter(
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
      )}

      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragCancel={onDragCancel}
        onDragEnd={onDragEnd}
        modifiers={view === "items" ? undefined : [snapVertical]}
      >
        <div className="mt-6">
          {view === "week" && (
            <WeekTimeGrid
              days={days}
              bookings={visibleBookings}
              items={items}
              accentByItemId={accentByItemId}
              dropHint={dropHint}
              hourStart={hourStart}
              hourEnd={hourEnd}
            />
          )}
          {view === "day" && (
            <DayTimeView
              day={selectedDay}
              bookings={visibleBookings}
              items={items}
              accentByItemId={accentByItemId}
              dropHint={dropHint}
              hourStart={hourStart}
              hourEnd={hourEnd}
            />
          )}
          {view === "items" && (
            <ItemsGrid
              days={days}
              bookings={visibleBookings}
              items={visibleItems}
              accentByItemId={accentByItemId}
              onDayClick={(d) => setSelectedDay(d)}
            />
          )}
        </div>

        {/* De overlay volgt de cursor (gesnapt op kwartieren) met een live
            tijd-label; het bron-blok blijft vervaagd staan als referentie. */}
        <DragOverlay dropAnimation={null}>
          {dragging ? (
            <div
              className={cn(
                "flex flex-col justify-center overflow-hidden rounded-md bg-gradient-to-br px-2 text-[10px] font-medium text-white shadow-xl ring-2 ring-white/40",
                accentByItemId.get(dragging.booking.itemId) ??
                  "from-primary to-primary",
              )}
              style={{ width: dragging.width, height: dragging.height }}
            >
              <span className="truncate font-semibold tabular-nums">
                {dropHint?.label ??
                  `${format(parseISO(dragging.booking.startAt), "HH:mm")} – ${format(parseISO(dragging.booking.endAt), "HH:mm")}`}
              </span>
              <span className="truncate opacity-90">
                {dragging.booking.itemName} · {dragging.booking.customerName}
              </span>
            </div>
          ) : null}
        </DragOverlay>
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

function bookingPosition(
  start: Date,
  end: Date,
  day: Date,
  hourStart: number,
  hourEnd: number,
) {
  const dayStart = startOfDay(day);
  const dayBoundaryStart = new Date(dayStart);
  dayBoundaryStart.setHours(hourStart, 0, 0, 0);
  const dayBoundaryEnd = new Date(dayStart);
  dayBoundaryEnd.setHours(hourEnd + 1, 0, 0, 0);

  const visibleStart = start < dayBoundaryStart ? dayBoundaryStart : start;
  const visibleEnd = end > dayBoundaryEnd ? dayBoundaryEnd : end;

  if (visibleStart >= dayBoundaryEnd || visibleEnd <= dayBoundaryStart) return null;

  const top =
    (differenceInMinutes(visibleStart, dayBoundaryStart) / 60) * HOUR_HEIGHT;
  const height = Math.max(
    22,
    (differenceInMinutes(visibleEnd, visibleStart) / 60) * HOUR_HEIGHT,
  );
  return { top, height };
}

interface PositionedBooking {
  b: BookingRow;
  top: number;
  height: number;
  startMs: number;
  endMs: number;
}

/**
 * Verdeel overlappende boekingen over "lanen" zodat ze naast elkaar staan
 * i.p.v. onleesbaar over elkaar heen. Klassiek interval-algoritme: sorteer
 * op starttijd, geef elke boeking de eerste vrije laan; per overlappend
 * cluster bepaalt het gebruikte aantal lanen de breedte.
 */
function assignLanes(
  items: PositionedBooking[],
): Map<string, { lane: number; lanes: number }> {
  const sorted = [...items].sort(
    (a, b) => a.startMs - b.startMs || b.endMs - a.endMs,
  );
  const result = new Map<string, { lane: number; lanes: number }>();
  let cluster: PositionedBooking[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    const laneCount = Math.max(1, laneEnds.length);
    for (const it of cluster) {
      const r = result.get(it.b.id);
      if (r) result.set(it.b.id, { lane: r.lane, lanes: laneCount });
    }
    cluster = [];
    laneEnds = [];
  };

  for (const it of sorted) {
    if (cluster.length > 0 && it.startMs >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= it.startMs);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(it.endMs);
    } else {
      laneEnds[lane] = it.endMs;
    }
    result.set(it.b.id, { lane, lanes: 1 });
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.endMs);
  }
  flush();
  return result;
}

/** Positioneer boekingen van één dag incl. laan-indeling. */
function positionDayBookings(
  dayBookings: BookingRow[],
  day: Date,
  hourStart: number,
  hourEnd: number,
): { positioned: PositionedBooking[]; lanes: Map<string, { lane: number; lanes: number }> } {
  const positioned: PositionedBooking[] = [];
  for (const b of dayBookings) {
    const start = parseISO(b.startAt);
    const end = parseISO(b.endAt);
    const pos = bookingPosition(start, end, day, hourStart, hourEnd);
    if (!pos) continue;
    positioned.push({
      b,
      ...pos,
      startMs: start.getTime(),
      endMs: end.getTime(),
    });
  }
  return { positioned, lanes: assignLanes(positioned) };
}

/** Rode "nu"-lijn in de kolom van vandaag. */
function NowLine({ hourStart, hourEnd }: { hourStart: number; hourEnd: number }) {
  const now = new Date();
  const mins = (now.getHours() - hourStart) * 60 + now.getMinutes();
  const maxMins = (hourEnd + 1 - hourStart) * 60;
  if (mins < 0 || mins > maxMins) return null;
  const top = (mins / 60) * HOUR_HEIGHT;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top }}>
      <div className="relative h-[2px] bg-[oklch(0.6_0.22_25)]/80">
        <span className="absolute -top-[3px] left-0 size-2 rounded-full bg-[oklch(0.6_0.22_25)]" />
      </div>
    </div>
  );
}

/** Ghost-indicator: gestippeld blok op de plek waar de sleep zou landen. */
function DropGhost({ hint }: { hint: DropHint }) {
  return (
    <div
      className="pointer-events-none absolute inset-x-[3px] z-10 rounded-md border-2 border-dashed border-primary/70 bg-primary/10"
      style={{ top: hint.top + 1, height: hint.height - 2 }}
    >
      <span className="absolute left-1 top-1 rounded bg-primary px-1 py-0.5 text-[9px] font-semibold tabular-nums text-primary-foreground shadow-sm">
        {hint.label}
      </span>
    </div>
  );
}

function WeekTimeGrid({
  days,
  bookings,
  items,
  accentByItemId,
  dropHint,
  hourStart,
  hourEnd,
}: {
  days: Date[];
  bookings: BookingRow[];
  items: ItemRow[];
  accentByItemId: Map<string, string>;
  dropHint: DropHint | null;
  hourStart: number;
  hourEnd: number;
}) {
  const hours = hoursRange(hourStart, hourEnd);
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center text-sm text-muted-foreground">
        Voeg eerst items toe aan je catalogus voor je boekingen kunt plannen.
      </div>
    );
  }

  // Per dag alvast positioneren zodat we weten hoeveel lanen elke dag
  // nodig heeft. Drukke dagen krijgen een bredere kolom (het rooster
  // scrollt horizontaal toch al) zodat parallelle boekingen leesbaar
  // blijven i.p.v. tot sliertjes samengeknepen te worden.
  const dayData = days.map((d) => {
    const dayBookings = bookings.filter((b) => {
      const s = parseISO(b.startAt);
      const e = parseISO(b.endAt);
      return s < addDays(startOfDay(d), 1) && e > startOfDay(d);
    });
    const { positioned, lanes } = positionDayBookings(dayBookings, d, hourStart, hourEnd);
    let maxLanes = 1;
    for (const v of lanes.values()) maxLanes = Math.max(maxLanes, v.lanes);
    return { d, positioned, lanes, maxLanes };
  });
  const gridTemplate = `60px ${dayData
    .map(
      ({ maxLanes }) =>
        `minmax(${Math.max(110, maxLanes * 88)}px, ${maxLanes}fr)`,
    )
    .join(" ")}`;

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <div className="min-w-[840px]">
        {/* Header row */}
        <div
          className="grid border-b border-border bg-muted/30 text-xs"
          style={{ gridTemplateColumns: gridTemplate }}
        >
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
          className="relative grid"
          style={{
            height: hours.length * HOUR_HEIGHT,
            gridTemplateColumns: gridTemplate,
          }}
        >
          {/* Hour labels */}
          <div className="relative border-r border-border">
            {hours.map((h, i) => (
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
          {dayData.map(({ d, positioned, lanes }) => {
            return (
              <div
                key={d.toISOString()}
                className={cn(
                  "relative border-l border-border",
                  isToday(d) && "bg-primary/[0.025]",
                )}
              >
                {/* Hour grid lines + per-hour drop slots */}
                {hours.map((h, i) => (
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
                {/* Booking blocks — overlappende boekingen krijgen elk een
                    eigen laan; korte boekingen een compacte één-regel-look. */}
                {(() => {
                  return positioned.map(({ b, top, height }) => {
                    const li = lanes.get(b.id) ?? { lane: 0, lanes: 1 };
                    const compact = height < 40;
                    return (
                      <DraggableBooking
                        key={b.id}
                        bookingId={b.id}
                        href={`/dashboard/bookings/${b.id}`}
                        className={cn(
                          "absolute flex flex-col overflow-hidden rounded-md bg-gradient-to-br text-[10px] font-medium text-white shadow-sm transition-all hover:z-10 hover:brightness-110",
                          compact
                            ? "justify-center px-1.5 leading-none"
                            : "gap-0.5 px-1.5 py-1",
                          accentByItemId.get(b.itemId) ?? "from-primary to-primary",
                          b.status === "CANCELED" && "opacity-50 line-through",
                        )}
                        style={{
                          top: top + 1,
                          height: height - 2,
                          left: `calc(${(li.lane / li.lanes) * 100}% + 3px)`,
                          width: `calc(${100 / li.lanes}% - 6px)`,
                        }}
                        title={`${b.itemName} · ${b.customerName} · ${format(parseISO(b.startAt), "HH:mm")}–${format(parseISO(b.endAt), "HH:mm")} — sleep om te verplaatsen`}
                      >
                        {compact ? (
                          <span className="truncate text-[9px]">
                            <span className="font-semibold tabular-nums">
                              {format(parseISO(b.startAt), "HH:mm")}
                            </span>{" "}
                            {b.customerName}
                          </span>
                        ) : (
                          <>
                            <span className="truncate font-semibold">
                              {format(parseISO(b.startAt), "HH:mm")} {b.itemName}
                            </span>
                            <span className="truncate opacity-90">
                              {b.customerName}
                            </span>
                          </>
                        )}
                      </DraggableBooking>
                    );
                  });
                })()}
                {dropHint && dropHint.dayKey === format(d, "yyyy-MM-dd") && (
                  <DropGhost hint={dropHint} />
                )}
                {isToday(d) && <NowLine hourStart={hourStart} hourEnd={hourEnd} />}
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
  dropHint,
  hourStart,
  hourEnd,
}: {
  day: Date;
  bookings: BookingRow[];
  items: ItemRow[];
  accentByItemId: Map<string, string>;
  dropHint: DropHint | null;
  hourStart: number;
  hourEnd: number;
}) {
  const hours = hoursRange(hourStart, hourEnd);
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
          style={{ height: hours.length * HOUR_HEIGHT }}
        >
          {/* Hour labels */}
          <div className="relative border-r border-border">
            {hours.map((h, i) => (
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
            {hours.map((h, i) => (
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
            {(() => {
              const { positioned, lanes } = positionDayBookings(dayBookings, day, hourStart, hourEnd);
              return positioned.map(({ b, top, height }) => {
                const li = lanes.get(b.id) ?? { lane: 0, lanes: 1 };
                const compact = height < 44;
                return (
                  <DraggableBooking
                    key={b.id}
                    bookingId={b.id}
                    href={`/dashboard/bookings/${b.id}`}
                    className={cn(
                      "absolute flex flex-col overflow-hidden rounded-md bg-gradient-to-br text-xs font-medium text-white shadow-sm transition-all hover:z-10 hover:brightness-110",
                      compact
                        ? "justify-center px-2.5 leading-none"
                        : "gap-0.5 px-3 py-2",
                      accentByItemId.get(b.itemId) ?? "from-primary to-primary",
                      b.status === "CANCELED" && "opacity-50 line-through",
                    )}
                    style={{
                      top: top + 1,
                      height: height - 2,
                      left: `calc(${(li.lane / li.lanes) * 100}% + 5px)`,
                      width: `calc(${100 / li.lanes}% - 10px)`,
                    }}
                    title={`${b.itemName} · ${b.customerName} · ${format(parseISO(b.startAt), "HH:mm")}–${format(parseISO(b.endAt), "HH:mm")} — sleep om te verplaatsen`}
                  >
                    {compact ? (
                      <span className="truncate text-[11px]">
                        <span className="font-semibold tabular-nums">
                          {format(parseISO(b.startAt), "HH:mm")}
                        </span>{" "}
                        {b.itemName} · {b.customerName}
                      </span>
                    ) : (
                      <>
                        <span className="truncate text-[11px] font-semibold opacity-95">
                          {format(parseISO(b.startAt), "HH:mm")} –{" "}
                          {format(parseISO(b.endAt), "HH:mm")}
                        </span>
                        <span className="truncate text-sm font-semibold">
                          {b.itemName}
                        </span>
                        <span className="truncate opacity-90">{b.customerName}</span>
                      </>
                    )}
                  </DraggableBooking>
                );
              });
            })()}
            {dropHint && dropHint.dayKey === format(day, "yyyy-MM-dd") && (
              <DropGhost hint={dropHint} />
            )}
            {isToday(day) && <NowLine hourStart={hourStart} hourEnd={hourEnd} />}
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
                  {(() => {
                    // Zelfde afgeleide status als de boekingenlijst —
                    // PENDING/CONFIRMED zijn voor de gebruiker allebei
                    // gewoon "Gereserveerd" (er is geen bevestig-stap).
                    const st = deriveBookingStatus(b.status);
                    return (
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium",
                          st.cls,
                        )}
                      >
                        {st.main}
                      </span>
                    );
                  })()}
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
  const router = useRouter();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${BOOKING_DRAG_PREFIX}${bookingId}`,
  });

  // Track whether a drag actually occurred during this press. dnd-kit clears
  // isDragging before the click event fires after pointerup, so checking
  // isDragging alone in onClick is unreliable. Set on isDragging→true,
  // cleared by the click handler after it suppresses the navigation. We
  // also clear it via a short timeout in case no click event fires
  // (e.g. dropped on a different element).
  const wasDragRef = useRef(false);
  useEffect(() => {
    if (isDragging) {
      wasDragRef.current = true;
    } else if (wasDragRef.current) {
      // Drag has ended — schedule a clear so a regular click later still
      // navigates. 200ms is well past the synthetic click window.
      const id = window.setTimeout(() => {
        wasDragRef.current = false;
      }, 200);
      return () => window.clearTimeout(id);
    }
  }, [isDragging]);

  // Géén transform op het bron-element: de DragOverlay volgt de cursor.
  // Het origineel blijft vervaagd staan als anker ("hier kwam je vandaan").
  const dragStyle: React.CSSProperties = {
    ...style,
    cursor: "grab",
    opacity: isDragging ? 0.35 : undefined,
  };

  return (
    // Plain div instead of <Link> — we control navigation manually so a
    // drop never accidentally triggers Next.js' SPA navigation. The
    // trade-off is geen prefetch + geen rechtsklik-open-in-new-tab. Voor
    // booking-cards is dat acceptabel.
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-label={title}
      className={cn(className, "touch-none select-none active:cursor-grabbing")}
      style={dragStyle}
      title={title}
      onClick={(e) => {
        if (isDragging || wasDragRef.current) {
          e.preventDefault();
          e.stopPropagation();
          wasDragRef.current = false;
          return;
        }
        router.push(href);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(href);
        }
      }}
    >
      {children}
    </div>
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

