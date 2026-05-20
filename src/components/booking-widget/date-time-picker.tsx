"use client";

import "react-day-picker/style.css";
import { useEffect, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { CalendarDays, Loader2 } from "lucide-react";

/**
 * Eén bron van waarheid voor datum + tijdvak-keuze. Wordt zowel in de
 * publieke boek-widget gebruikt (waar de logica oorspronkelijk geboren
 * is) als in het dashboard-formulier voor "Nieuwe boeking" — zodat de
 * eigenaar dezelfde kalender + uur-grid ziet als zijn klanten.
 *
 * Houdt zelf rekening met:
 *  - Per-dag items (interval = 1440) → geen tijdkeuze, uren vast 00:00–23:59.
 *  - Uur-items → twee grids, eindtijd > starttijd op één dag.
 *  - "Inside booking" + range-overlap regels (incl. externe agenda-blokken).
 *  - Klikken op een nieuwe starttijd die ná de huidige eindtijd ligt
 *    leegt automatisch de eindtijd, en andersom.
 */

interface Interval {
  startMs: number;
  endMs: number;
}

interface SlotConfig {
  intervalMinutes: number;
  windowStartMin: number;
  windowEndMin: number;
}

const DEFAULT_SLOT_CONFIG: SlotConfig = {
  intervalMinutes: 60,
  windowStartMin: 540,
  windowEndMin: 1080,
};

export interface DateTimeValue {
  date: Date | null;
  startTime: string; // "HH:MM" of "" als niet gekozen
  endTime: string;
}

interface Props {
  slug: string;
  itemId: string | null;
  /** Aksent-kleur — default = de app-primary. */
  accent?: string;
  value: DateTimeValue;
  onChange: (next: DateTimeValue) => void;
  /** Sluit de boeking zelf uit van de bezetlijst (bij bewerken). */
  excludeBookingId?: string;
}

function minToHHMM(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function hhmmToMin(s: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
}

function atTimeMs(day: Date, hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

function rangeOverlaps(
  startMs: number,
  endMs: number,
  list: Interval[],
): boolean {
  if (!(endMs > startMs)) return false;
  return list.some((b) => b.startMs < endMs && b.endMs > startMs);
}

function generateSlots(cfg: SlotConfig): string[] {
  const out: string[] = [];
  for (
    let m = cfg.windowStartMin;
    m <= cfg.windowEndMin;
    m += cfg.intervalMinutes
  ) {
    out.push(minToHHMM(m));
  }
  return out;
}

export function DateTimePicker({
  slug,
  itemId,
  accent = "var(--primary)",
  value,
  onChange,
  excludeBookingId,
}: Props) {
  const [unavailableDates, setUnavailableDates] = useState<Set<string>>(
    new Set(),
  );
  const [lookaheadDays, setLookaheadDays] = useState(180);
  const [slotConfig, setSlotConfig] =
    useState<SlotConfig>(DEFAULT_SLOT_CONFIG);
  const [intervals, setIntervals] = useState<Interval[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!slug || !itemId) {
      setUnavailableDates(new Set());
      setIntervals([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(
      `/api/public/availability?slug=${encodeURIComponent(slug)}&itemId=${encodeURIComponent(itemId)}`,
      { cache: "no-store" },
    )
      .then((r) => r.json())
      .then((res) => {
        if (cancelled || !res?.ok) return;
        setUnavailableDates(new Set<string>(res.unavailableDates ?? []));
        setLookaheadDays(res.lookaheadDays ?? 180);
        setSlotConfig({
          intervalMinutes: res.bookingIntervalMinutes,
          windowStartMin: res.bookingWindowStartMin,
          windowEndMin: res.bookingWindowEndMin,
        });
        // Boekingen + externe agenda-blokken samengevoegd voor de
        // slot-grid (zonder de "exclude" boeking bij bewerken).
        const merged: Interval[] = [
          ...((res.bookings as Interval[]) ?? []),
          ...((res.blocks as Interval[]) ?? []),
        ];
        setIntervals(merged);
        // Per-dag items: tijden impliciet de hele dag — anders niets
        // vooraf selecteren, klant kiest zelf.
        if (res.bookingIntervalMinutes === 1440) {
          if (value.startTime !== "00:00" || value.endTime !== "23:59") {
            onChange({ ...value, startTime: "00:00", endTime: "23:59" });
          }
        }
      })
      .catch(() => {
        if (cancelled) return;
        setUnavailableDates(new Set());
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, itemId, excludeBookingId]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const lookaheadEnd = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + lookaheadDays);
    return d;
  }, [today, lookaheadDays]);

  const formatDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const isUnavailable = (d: Date) => unavailableDates.has(formatDateKey(d));
  const isAvailable = (d: Date) =>
    d >= today && d <= lookaheadEnd && !unavailableDates.has(formatDateKey(d));

  const setDate = (d: Date | undefined) => {
    onChange({ ...value, date: d ?? null });
  };

  return (
    <div style={{ ["--rdp-accent-color" as string]: accent }}>
      {/* Samenvattings-chip */}
      <div className="mb-3 rounded-lg border border-border bg-muted/30 p-2">
        <div className="rounded-md border border-border bg-background px-3 py-2">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
            <CalendarDays className="size-3.5" />
            Wanneer
          </p>
          {value.date ? (
            <p className="text-sm font-semibold tracking-tight">
              {format(value.date, "EEEE d MMM", { locale: nl })}
              {value.startTime && value.endTime && (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground tabular-nums">
                  · {value.startTime} — {value.endTime}
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Kies een dag</p>
          )}
        </div>
      </div>

      {/* Kalender */}
      <div className="rounded-xl border border-border bg-card p-2 sm:p-3">
        <div className="flex justify-center">
          <DayPicker
            mode="single"
            selected={value.date ?? undefined}
            onSelect={setDate}
            numberOfMonths={1}
            weekStartsOn={1}
            locale={nl}
            disabled={[{ before: today }, isUnavailable]}
            modifiers={{ bbAvailable: isAvailable, bbUnavailable: isUnavailable }}
            modifiersClassNames={{
              bbAvailable: "rdp-bb-available",
              bbUnavailable: "rdp-bb-unavailable",
            }}
            showOutsideDays
            className="rdp-bb"
          />
        </div>
        <div className="mt-2 flex items-center justify-center gap-4 border-t border-border pt-2 text-[10px] font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-[oklch(0.78_0.13_145)]" />
            Beschikbaar
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-[oklch(0.72_0.16_25)]" />
            Vol
          </span>
          {loading && (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="size-2.5 animate-spin" />
              laden
            </span>
          )}
        </div>
      </div>

      {/* Tijdvak-grid (één grid, klik = start, 2e klik = eind) */}
      {slotConfig.intervalMinutes !== 1440 && (
        <div className="mt-4">
          <TimeRangeGrid
            startTime={value.startTime}
            endTime={value.endTime}
            day={value.date}
            cfg={slotConfig}
            intervals={intervals}
            accent={accent}
            onPick={(next) =>
              onChange({
                ...value,
                startTime: next.startTime,
                endTime: next.endTime,
              })
            }
          />
        </div>
      )}
    </div>
  );
}

function TimeRangeGrid({
  startTime,
  endTime,
  day,
  cfg,
  intervals,
  accent,
  onPick,
  labels = {
    title: "Tijdvak",
    hint: "Klik je starttijd en daarna je eindtijd.",
    fullTitle: "Vol",
  },
}: {
  startTime: string;
  endTime: string;
  day: Date | null;
  cfg: SlotConfig;
  intervals: Interval[];
  accent: string;
  onPick: (next: { startTime: string; endTime: string }) => void;
  labels?: { title: string; hint: string; fullTitle: string };
}) {
  const slots = useMemo(() => generateSlots(cfg), [cfg]);
  const startMin = startTime ? hhmmToMin(startTime) : -1;
  const endMin = endTime ? hhmmToMin(endTime) : -1;

  const handleClick = (slot: string) => {
    const slotMin = hhmmToMin(slot);
    // 1) Nog niks gekozen, of allebei gekozen → herstart vanaf deze klik.
    if (!startTime || (startTime && endTime)) {
      onPick({ startTime: slot, endTime: "" });
      return;
    }
    // 2) Start gekozen, eind nog niet:
    if (slotMin <= startMin) {
      // Eerdere/dezelfde klik → wordt de nieuwe start.
      onPick({ startTime: slot, endTime: "" });
    } else {
      onPick({ startTime, endTime: slot });
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
          {labels.title}
        </span>
        <span
          className="text-[10px] font-semibold tracking-wide tabular-nums"
          style={{ color: accent }}
        >
          {startTime && endTime
            ? `${startTime} — ${endTime}`
            : startTime || "—"}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground">{labels.hint}</p>
      <div className="mt-1 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
        {slots.map((slot) => {
          const slotMin = hhmmToMin(slot);

          // 1) Slot-zelf zit in een boeking → uit.
          let overlap = false;
          if (day) {
            const a = atTimeMs(day, slot);
            overlap = rangeOverlaps(
              a,
              a + cfg.intervalMinutes * 60_000,
              intervals,
            );
          }
          // 2) Start al gezet, slot ligt erna: bereik mag geen boeking
          //    raken — anders kun je die niet als eind kiezen.
          let crossDisabled = false;
          if (!overlap && day && startTime && !endTime && slotMin > startMin) {
            crossDisabled = rangeOverlaps(
              atTimeMs(day, startTime),
              atTimeMs(day, slot),
              intervals,
            );
          }
          const disabled = overlap || crossDisabled;

          const isStart = startTime === slot;
          const isEnd = endTime === slot;
          const inBetween =
            startMin >= 0 &&
            endMin > 0 &&
            slotMin > startMin &&
            slotMin < endMin;

          return (
            <button
              key={slot}
              type="button"
              disabled={disabled}
              onClick={() => handleClick(slot)}
              title={overlap ? labels.fullTitle : undefined}
              className={`h-9 rounded-md border text-xs font-semibold tabular-nums transition-all ${
                isStart || isEnd
                  ? "border-transparent shadow-sm"
                  : disabled
                    ? "cursor-not-allowed border-dashed border-border/60 bg-muted/20 text-muted-foreground/40 line-through"
                    : "border-border bg-background hover:-translate-y-0.5 hover:shadow-sm"
              }`}
              style={
                isStart || isEnd
                  ? {
                      background: accent,
                      color: "var(--bb-on-accent, #fff)",
                      boxShadow: `0 2px 8px -2px color-mix(in oklch, ${accent} 50%, transparent)`,
                    }
                  : inBetween
                    ? {
                        background: `color-mix(in oklch, ${accent} 14%, transparent)`,
                        borderColor: `color-mix(in oklch, ${accent} 30%, transparent)`,
                        color: accent,
                      }
                    : undefined
              }
              onMouseEnter={(e) => {
                if (!isStart && !isEnd && !inBetween && !disabled) {
                  e.currentTarget.style.borderColor = accent;
                  e.currentTarget.style.color = accent;
                }
              }}
              onMouseLeave={(e) => {
                if (!isStart && !isEnd && !inBetween && !disabled) {
                  e.currentTarget.style.borderColor = "";
                  e.currentTarget.style.color = "";
                }
              }}
            >
              {slot}
            </button>
          );
        })}
      </div>
    </div>
  );
}
