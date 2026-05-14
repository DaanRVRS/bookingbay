"use client";

import "react-day-picker/style.css";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DayPicker, type DateRange } from "react-day-picker";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { ArrowRight, CalendarDays, CheckCircle2, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/auth/FormField";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createPublicBookingAction,
  getItemAvailabilityAction,
} from "@/lib/bookings/public-actions";
import {
  publicBookingSchema,
  type PublicBookingInput,
} from "@/lib/bookings/public-schemas";

interface ItemOption {
  id: string;
  name: string;
  pricePerHour: number | null;
  pricePerDay: number | null;
}

interface Props {
  slug: string;
  orgName: string;
  accent: string;
  fixedItem?: ItemOption;
  itemOptions?: ItemOption[];
}

const DEFAULT_START_TIME = "09:00";
const DEFAULT_END_TIME = "17:00";

interface SlotConfig {
  intervalMinutes: number;
  windowStartMin: number;
  windowEndMin: number;
}

const DEFAULT_SLOT_CONFIG: SlotConfig = {
  intervalMinutes: 60,
  windowStartMin: 540, // 09:00
  windowEndMin: 1080, // 18:00
};

interface BookingInterval {
  startMs: number;
  endMs: number;
}

function minToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function generateSlots(cfg: SlotConfig): string[] {
  const out: string[] = [];
  for (let m = cfg.windowStartMin; m <= cfg.windowEndMin; m += cfg.intervalMinutes) {
    out.push(minToHHMM(m));
  }
  return out;
}

function slotOverlapsAnyBooking(
  dayDate: Date,
  hhmm: string,
  intervalMinutes: number,
  bookings: BookingInterval[],
): boolean {
  const [h, m] = hhmm.split(":").map(Number);
  const start = new Date(dayDate);
  start.setHours(h, m, 0, 0);
  const end = new Date(start.getTime() + intervalMinutes * 60_000);
  const startMs = start.getTime();
  const endMs = end.getTime();
  return bookings.some((b) => b.startMs < endMs && b.endMs > startMs);
}

export function PublicBookingForm({
  slug,
  orgName,
  accent,
  fixedItem,
  itemOptions,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [startTime, setStartTime] = useState(DEFAULT_START_TIME);
  const [endTime, setEndTime] = useState(DEFAULT_END_TIME);
  const [unavailableDates, setUnavailableDates] = useState<Set<string>>(
    new Set(),
  );
  const [lookaheadDays, setLookaheadDays] = useState<number>(180);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [slotConfig, setSlotConfig] = useState<SlotConfig>(DEFAULT_SLOT_CONFIG);
  const [bookings, setBookings] = useState<BookingInterval[]>([]);

  const itemsById = useMemo(() => {
    const map = new Map<string, ItemOption>();
    if (fixedItem) map.set(fixedItem.id, fixedItem);
    itemOptions?.forEach((it) => map.set(it.id, it));
    return map;
  }, [fixedItem, itemOptions]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    setValue,
    watch,
  } = useForm<PublicBookingInput>({
    resolver: zodResolver(publicBookingSchema),
    defaultValues: {
      slug,
      itemId: fixedItem?.id ?? "",
      startAt: "",
      endAt: "",
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      notes: "",
    },
  });

  // Sync calendar range + times into the form state (startAt/endAt are
  // hidden — only the calendar/time UI mutates them).
  useEffect(() => {
    if (range?.from) {
      const startStr = `${format(range.from, "yyyy-MM-dd")}T${startTime}`;
      setValue("startAt", startStr, { shouldValidate: true });
    } else {
      setValue("startAt", "", { shouldValidate: false });
    }
    if (range?.to) {
      const endStr = `${format(range.to, "yyyy-MM-dd")}T${endTime}`;
      setValue("endAt", endStr, { shouldValidate: true });
    } else if (range?.from) {
      // Single-day booking: end on same day at end time.
      const endStr = `${format(range.from, "yyyy-MM-dd")}T${endTime}`;
      setValue("endAt", endStr, { shouldValidate: true });
    } else {
      setValue("endAt", "", { shouldValidate: false });
    }
  }, [range, startTime, endTime, setValue]);

  const watchedItemId = watch("itemId");
  const watchedStart = watch("startAt");
  const watchedEnd = watch("endAt");

  // Fetch per-day availability whenever the selected item changes.
  useEffect(() => {
    if (!watchedItemId) {
      setUnavailableDates(new Set());
      return;
    }
    let cancelled = false;
    setAvailabilityLoading(true);
    getItemAvailabilityAction({ slug, itemId: watchedItemId })
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setUnavailableDates(new Set(res.unavailableDates));
          setLookaheadDays(res.lookaheadDays);
          setSlotConfig({
            intervalMinutes: res.bookingIntervalMinutes,
            windowStartMin: res.bookingWindowStartMin,
            windowEndMin: res.bookingWindowEndMin,
          });
          setBookings(res.bookings);
          // For per-day items, force start/end times to whole-day defaults
          if (res.bookingIntervalMinutes === 1440) {
            setStartTime("00:00");
            setEndTime("23:59");
          } else {
            setStartTime(minToHHMM(res.bookingWindowStartMin));
            setEndTime(minToHHMM(res.bookingWindowEndMin));
          }
        } else {
          setUnavailableDates(new Set());
        }
      })
      .catch(() => {
        if (cancelled) return;
        setUnavailableDates(new Set());
      })
      .finally(() => {
        if (cancelled) return;
        setAvailabilityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, watchedItemId]);

  const selectedItem = watchedItemId ? itemsById.get(watchedItemId) : undefined;
  const estimate = useMemo(() => {
    if (!selectedItem || !watchedStart || !watchedEnd) return null;
    const start = new Date(watchedStart);
    const end = new Date(watchedEnd);
    if (!(end > start)) return null;
    const ms = end.getTime() - start.getTime();
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
    const hours = Math.ceil(ms / (1000 * 60 * 60));
    if (selectedItem.pricePerDay) return selectedItem.pricePerDay * days;
    if (selectedItem.pricePerHour) return selectedItem.pricePerHour * hours;
    return null;
  }, [selectedItem, watchedStart, watchedEnd]);

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const res = await createPublicBookingAction(values);
      if (!res.ok) {
        if (res.fieldErrors) {
          for (const [k, v] of Object.entries(res.fieldErrors)) {
            setError(k as keyof PublicBookingInput, { message: v });
          }
        }
        toast.error(res.error);
        return;
      }
      setDone(true);
    });
  });

  if (done) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-border bg-card px-6 py-10 text-center">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-32 opacity-30"
          style={{
            background: `radial-gradient(ellipse at top, ${accent}40 0%, transparent 70%)`,
          }}
        />
        <div className="relative">
          <span
            className="mx-auto grid size-16 place-items-center rounded-full text-white shadow-lg"
            style={{
              background: accent,
              boxShadow: `0 8px 24px -6px ${accent}80`,
            }}
          >
            <CheckCircle2 className="size-8" />
          </span>
          <h3 className="mt-5 text-xl font-semibold tracking-tight">
            Aanvraag verstuurd
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {orgName} bevestigt je boeking zo snel mogelijk per e-mail. Houd je inbox
            (en spam) in de gaten — meestal binnen één werkdag.
          </p>
        </div>
      </div>
    );
  }

  const showItemPicker =
    !fixedItem && (!itemOptions || itemOptions.length > 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lookaheadEnd = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + lookaheadDays);
    return d;
  }, [today, lookaheadDays]);

  const formatDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const isUnavailable = (date: Date) =>
    unavailableDates.has(formatDateKey(date));

  const isAvailable = (date: Date) => {
    if (date < today) return false;
    if (date > lookaheadEnd) return false;
    return !unavailableDates.has(formatDateKey(date));
  };

  // Single-day if no `to` selected — display same date for both ends
  const displayFrom = range?.from ?? null;
  const displayTo = range?.to ?? range?.from ?? null;

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-5"
      style={{ ["--rdp-accent-color" as string]: accent }}
    >
      {!fixedItem && itemOptions && itemOptions.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-card/40 px-4 py-6 text-center text-sm text-muted-foreground">
          Geen items beschikbaar om te boeken.
        </div>
      )}

      {showItemPicker && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="itemId">Welk item wil je boeken?</Label>
          <select
            id="itemId"
            {...register("itemId")}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-invalid={Boolean(errors.itemId) || undefined}
          >
            <option value="">— kies een item —</option>
            {itemOptions!.map((it) => (
              <option key={it.id} value={it.id}>
                {it.name}
              </option>
            ))}
          </select>
          {errors.itemId && (
            <p className="text-xs font-medium text-destructive">{errors.itemId.message}</p>
          )}
        </div>
      )}

      {/* Wanneer — visible calendar */}
      <Section icon={CalendarDays} accent={accent} title="Wanneer">
        {/* Selected range summary */}
        <div className="mb-3 grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/30 p-2">
          <DateChip
            label="Vanaf"
            date={displayFrom}
            time={startTime}
            placeholder="Kies een dag"
            accent={accent}
            active={Boolean(displayFrom)}
          />
          <DateChip
            label="Tot"
            date={displayTo}
            time={endTime}
            placeholder="Kies een dag"
            accent={accent}
            active={Boolean(displayTo)}
          />
        </div>

        <div className="rounded-xl border border-border bg-card p-2 sm:p-3">
          <DayPicker
            mode="range"
            selected={range}
            onSelect={setRange}
            numberOfMonths={1}
            weekStartsOn={1}
            locale={nl}
            disabled={[{ before: today }, isUnavailable]}
            modifiers={{
              bbAvailable: isAvailable,
              bbUnavailable: isUnavailable,
            }}
            modifiersClassNames={{
              bbAvailable: "rdp-bb-available",
              bbUnavailable: "rdp-bb-unavailable",
            }}
            showOutsideDays
            className="rdp-bb"
          />
          <div className="mt-2 flex items-center justify-center gap-4 border-t border-border pt-2 text-[10px] font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-[oklch(0.78_0.13_145)]" />
              Beschikbaar
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-[oklch(0.72_0.16_25)]" />
              Vol
            </span>
            {availabilityLoading && (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="size-2.5 animate-spin" />
                laden
              </span>
            )}
          </div>
        </div>

        {/* Time inputs — verborgen voor per-dag items (interval = 1440) */}
        {slotConfig.intervalMinutes !== 1440 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <SlotSelect
              label="Starttijd"
              value={startTime}
              onChange={setStartTime}
              dayDate={range?.from ?? null}
              cfg={slotConfig}
              bookings={bookings}
              isStart
              otherTime={endTime}
            />
            <SlotSelect
              label="Eindtijd"
              value={endTime}
              onChange={setEndTime}
              dayDate={range?.to ?? range?.from ?? null}
              cfg={slotConfig}
              bookings={bookings}
              isStart={false}
              otherTime={startTime}
            />
          </div>
        )}

        {(errors.startAt || errors.endAt) && (
          <p className="mt-2 text-xs font-medium text-destructive">
            {errors.startAt?.message || errors.endAt?.message}
          </p>
        )}

        {estimate !== null && (
          <div
            className="mt-3 flex items-center justify-between gap-3 rounded-lg px-3.5 py-2.5"
            style={{
              background: `${accent}0D`,
              border: `1px solid ${accent}33`,
            }}
          >
            <div>
              <p className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
                Geschatte prijs
              </p>
              <p
                className="text-lg font-semibold tabular-nums leading-tight"
                style={{ color: accent }}
              >
                € {estimate.toFixed(2)}
              </p>
            </div>
            <p className="text-[10px] leading-snug text-muted-foreground">
              Definitief
              <br />
              door {orgName}
            </p>
          </div>
        )}
      </Section>

      {/* Wie ben je */}
      <Section icon={User} accent={accent} title="Jouw gegevens">
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="Naam"
              autoComplete="name"
              error={errors.customerName?.message}
              {...register("customerName")}
            />
            <FormField
              label="E-mail"
              type="email"
              autoComplete="email"
              error={errors.customerEmail?.message}
              {...register("customerEmail")}
            />
          </div>

          <FormField
            label="Telefoon (optioneel)"
            type="tel"
            autoComplete="tel"
            error={errors.customerPhone?.message}
            {...register("customerPhone")}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes" className="text-xs">
              Opmerkingen (optioneel)
            </Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder="Bv. ophaalvoorkeur, accessoires, ..."
              aria-invalid={Boolean(errors.notes) || undefined}
              {...register("notes")}
            />
            {errors.notes && (
              <p className="text-xs font-medium text-destructive">{errors.notes.message}</p>
            )}
          </div>
        </div>
      </Section>

      <button
        type="submit"
        disabled={pending}
        className="group relative mt-2 inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-xl px-6 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        style={{
          background: accent,
          boxShadow: `0 4px 14px -4px ${accent}80`,
        }}
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Versturen...
          </>
        ) : (
          <>
            Boeking aanvragen
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        Geen geld nu afgeschreven. {orgName} bevestigt per e-mail.
      </p>
    </form>
  );
}

function Section({
  icon: Icon,
  title,
  accent,
  children,
}: {
  icon: typeof CalendarDays;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2">
        <span
          className="grid size-6 place-items-center rounded-md"
          style={{ background: `${accent}15`, color: accent }}
        >
          <Icon className="size-3.5" />
        </span>
        <span className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function DateChip({
  label,
  date,
  time,
  placeholder,
  accent,
  active,
}: {
  label: string;
  date: Date | null;
  time: string;
  placeholder: string;
  accent: string;
  active: boolean;
}) {
  return (
    <div
      className="rounded-md bg-background px-3 py-2 transition-colors"
      style={
        active
          ? {
              border: `1px solid ${accent}55`,
              boxShadow: `inset 0 0 0 1px ${accent}15`,
            }
          : { border: "1px solid var(--border)" }
      }
    >
      <p className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
        {label}
      </p>
      {date ? (
        <p className="text-sm font-semibold tracking-tight">
          {format(date, "d MMM", { locale: nl })}
          <span className="ml-1.5 text-xs font-normal text-muted-foreground tabular-nums">
            · {time}
          </span>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">{placeholder}</p>
      )}
    </div>
  );
}

function SlotSelect({
  label,
  value,
  onChange,
  dayDate,
  cfg,
  bookings,
  isStart,
  otherTime,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  dayDate: Date | null;
  cfg: SlotConfig;
  bookings: BookingInterval[];
  isStart: boolean;
  otherTime: string;
}) {
  const slots = useMemo(() => generateSlots(cfg), [cfg]);

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border border-border bg-background px-2.5 text-sm tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {slots.map((slot) => {
          // Disable end-slots before/equal start, start-slots at/after end.
          const otherTimeMin = hhmmToMin(otherTime);
          const slotMin = hhmmToMin(slot);
          const beforeStart = !isStart && slotMin <= otherTimeMin;
          const afterEnd = isStart && slotMin >= otherTimeMin;
          const overlap = dayDate
            ? slotOverlapsAnyBooking(dayDate, slot, cfg.intervalMinutes, bookings)
            : false;
          const disabled = beforeStart || afterEnd || overlap;
          const suffix = overlap ? " — vol" : "";
          return (
            <option key={slot} value={slot} disabled={disabled}>
              {slot}
              {suffix}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function hhmmToMin(s: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return 0;
  return Number(m[1]) * 60 + Number(m[2]);
}
