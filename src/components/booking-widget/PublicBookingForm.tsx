"use client";

import "react-day-picker/style.css";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { useWidgetI18n } from "./widget-i18n";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Loader2,
  MapPin,
  User,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/auth/FormField";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  publicBookingSchema,
  type PublicBookingInput,
} from "@/lib/bookings/public-schemas";

// CSS-vars gezet door themeStyle() op een ouder; nette fallbacks.
const ON_ACCENT = "var(--bb-on-accent, #fff)";

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
  /** Wordt aangeroepen bij elke interne fase-overgang zodat de buiten-
   *  voortgangsbalk de juiste stap kan oplichten. */
  onPhaseChange?: (phase: "when" | "details" | "confirm") => void;
}

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

function atTimeMs(day: Date, hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

function rangeOverlapsBooking(
  startMs: number,
  endMs: number,
  bookings: BookingInterval[],
): boolean {
  if (!(endMs > startMs)) return false;
  return bookings.some((b) => b.startMs < endMs && b.endMs > startMs);
}

export function PublicBookingForm({
  slug,
  orgName,
  accent,
  fixedItem,
  itemOptions,
  onPhaseChange,
}: Props) {
  const { t, df } = useWidgetI18n();

  // Beginstand: meld dat we in fase "wanneer" zijn zodat de outer
  // voortgangsbalk meteen correct uitlicht.
  useEffect(() => {
    onPhaseChange?.("when");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  // Twee sub-stappen binnen het boekformulier: eerst datum/tijd, dan pas
  // (op een aparte stap) gegevens + betaalwijze.
  const [formStep, setFormStep] = useState<"when" | "details">("when");
  const [date, setDate] = useState<Date | undefined>(undefined);
  // Niets vooraf geselecteerd — de klant kiest zelf start- en eindtijd.
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [unavailableDates, setUnavailableDates] = useState<Set<string>>(
    new Set(),
  );
  const [lookaheadDays, setLookaheadDays] = useState<number>(180);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [slotConfig, setSlotConfig] = useState<SlotConfig>(DEFAULT_SLOT_CONFIG);
  const [bookings, setBookings] = useState<BookingInterval[]>([]);
  const [onlinePaymentAvailable, setOnlinePaymentAvailable] = useState(false);
  const [locationPaymentAvailable, setLocationPaymentAvailable] =
    useState(true);
  // null = nog niet gekozen. De boeking mag pas door als de klant
  // expliciet een betaalwijze heeft geselecteerd.
  const [paymentChoice, setPaymentChoice] = useState<
    "location" | "online" | null
  >(null);
  // Review-stap: na "Boeken" laten we eerst een overzicht zien. Pas op
  // "Bevestigen" wordt de boeking echt aangemaakt.
  const [reviewing, setReviewing] = useState(false);

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
    getValues,
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
    // Pas een datum/tijd doorzetten als de klant ze écht heeft gekozen.
    // Eén-dag boeking: start- en eindtijd liggen op dezelfde dag.
    if (date && startTime) {
      setValue("startAt", `${format(date, "yyyy-MM-dd")}T${startTime}`, {
        shouldValidate: true,
      });
    } else {
      setValue("startAt", "", { shouldValidate: false });
    }
    if (date && endTime) {
      setValue("endAt", `${format(date, "yyyy-MM-dd")}T${endTime}`, {
        shouldValidate: true,
      });
    } else {
      setValue("endAt", "", { shouldValidate: false });
    }
  }, [date, startTime, endTime, setValue]);

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
    fetch(
      `/api/public/availability?slug=${encodeURIComponent(slug)}&itemId=${encodeURIComponent(watchedItemId)}`,
      { cache: "no-store" },
    )
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return;
        if (res && res.ok) {
          setUnavailableDates(new Set(res.unavailableDates));
          setLookaheadDays(res.lookaheadDays);
          setSlotConfig({
            intervalMinutes: res.bookingIntervalMinutes,
            windowStartMin: res.bookingWindowStartMin,
            windowEndMin: res.bookingWindowEndMin,
          });
          setBookings(res.bookings);
          setOnlinePaymentAvailable(Boolean(res.onlinePaymentAvailable));
          setLocationPaymentAvailable(res.locationPaymentAvailable !== false);
          // Eén optie beschikbaar → automatisch voorselecteren (geen
          // zinloze keuze forceren).
          if (res.onlinePaymentAvailable && res.locationPaymentAvailable === false) {
            setPaymentChoice("online");
          } else if (!res.onlinePaymentAvailable) {
            setPaymentChoice("location");
          }
          // Per-dag items hebben geen tijdkeuze → impliciet de hele dag.
          // Voor uur-items NIETS voorselecteren: de klant kiest zelf.
          if (res.bookingIntervalMinutes === 1440) {
            setStartTime("00:00");
            setEndTime("23:59");
          } else {
            setStartTime("");
            setEndTime("");
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

  // ALLE hooks moeten vóór elke conditionele return staan (Rules of Hooks).
  // De `if (done)` / `if (reviewing)` returns hieronder zouden anders deze
  // useMemo overslaan en React laten crashen bij elke toggle.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lookaheadEnd = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + lookaheadDays);
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today.getTime(), lookaheadDays]);

  // Klik op een starttijd na de huidige eindtijd (of andersom) wordt
  // toegestaan: de tegenhanger wordt geleegd zodat de klant 'm opnieuw
  // kiest. Liever dat dan slots blokkeren — anders zit je vast aan een
  // eerdere keuze.
  const onPickStart = (s: string) => {
    setStartTime(s);
    if (endTime && hhmmToMin(s) >= hhmmToMin(endTime)) setEndTime("");
  };
  const onPickEnd = (e: string) => {
    setEndTime(e);
    if (startTime && hhmmToMin(e) <= hhmmToMin(startTime)) setStartTime("");
  };

  // Sub-stap "Wanneer" → "Gegevens": valideer dat datum + tijd gekozen
  // zijn voordat we naar de gegevens/betaal-stap gaan.
  const goToDetails = () => {
    if (!date) {
      toast.error(t("when.pickDate"));
      return;
    }
    if (slotConfig.intervalMinutes !== 1440 && (!startTime || !endTime)) {
      toast.error(t("when.pickTime"));
      return;
    }
    const s = getValues("startAt");
    const e = getValues("endAt");
    if (!s || !e || !(new Date(e).getTime() > new Date(s).getTime())) {
      toast.error(t("when.pickTime"));
      return;
    }
    setFormStep("details");
    onPhaseChange?.("details");
  };

  // Sub-stap "Gegevens": "Boeken" geklikt → valideer + ga naar review.
  // Hier wordt NOG GEEN boeking aangemaakt.
  const onSubmit = handleSubmit((values) => {
    if (!paymentChoice) {
      toast.error(t("pay.chooseFirst"));
      return;
    }
    void values;
    setReviewing(true);
    onPhaseChange?.("confirm");
  });

  // Stap 2: op de review-stap "Bevestigen" geklikt → boeking echt aanmaken.
  const confirmBooking = () => {
    if (!paymentChoice) {
      toast.error(t("pay.chooseFirst"));
      setReviewing(false);
      onPhaseChange?.("details");
      return;
    }
    startTransition(async () => {
      let res: {
        ok: boolean;
        error?: string;
        fieldErrors?: Record<string, string>;
        redirectUrl?: string;
      };
      try {
        const r = await fetch("/api/public/booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...getValues(),
            paymentChoice,
          }),
        });
        res = await r.json();
      } catch {
        toast.error(t("err.connection"));
        return;
      }

      if (!res.ok) {
        if (res.fieldErrors) {
          for (const [k, v] of Object.entries(res.fieldErrors)) {
            setError(k as keyof PublicBookingInput, { message: v });
          }
        }
        toast.error(res.error ?? t("err.generic"));
        setReviewing(false);
        onPhaseChange?.("details");
        return;
      }
      // Online gekozen → door naar Mollie/Stripe checkout.
      if (res.redirectUrl) {
        const target = res.redirectUrl;
        if (window.top && window.top !== window.self) {
          try {
            window.top.location.href = target;
            return;
          } catch {
            window.open(target, "_blank", "noopener");
            setDone(true);
            return;
          }
        }
        window.location.href = target;
        return;
      }
      // Op locatie → boeking bevestigd.
      setDone(true);
    });
  };

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
            className="mx-auto grid size-16 place-items-center rounded-full shadow-lg"
            style={{
              background: accent,
              color: ON_ACCENT,
              boxShadow: `0 8px 24px -6px ${accent}80`,
            }}
          >
            <CheckCircle2 className="size-8" />
          </span>
          <h3 className="mt-5 text-xl font-semibold tracking-tight">
            {t("done.title")}
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {t("done.body", { org: orgName })}
          </p>
        </div>
      </div>
    );
  }

  // Review-stap: overzicht van wat er geboekt wordt vóór definitief
  // bevestigen. Geen boeking aangemaakt tot "Bevestigen".
  if (reviewing) {
    const reviewItemName =
      fixedItem?.name ?? selectedItem?.name ?? t("review.selectedItem");
    const isPerDay = slotConfig.intervalMinutes === 1440;
    const whenLine = date
      ? isPerDay
        ? format(date, "EEEE d MMM yyyy", { locale: df })
        : `${format(date, "EEEE d MMM", { locale: df })} ${startTime} — ${endTime}`
      : "—";
    const isOnline = paymentChoice === "online";

    return (
      <div className="flex flex-col gap-4">
        <div>
          <button
            type="button"
            onClick={() => {
              setReviewing(false);
              onPhaseChange?.("details");
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowRight className="size-3 rotate-180" />
            {t("review.edit")}
          </button>
          <h2 className="mt-2 text-lg font-semibold tracking-tight">
            {t("review.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("review.subtitle")}
          </p>
        </div>

        <dl className="overflow-hidden rounded-xl border border-border bg-card">
          <ReviewRow
            label={t("review.item")}
            value={reviewItemName}
            accent={accent}
          />
          <ReviewRow
            label={t("review.when")}
            value={whenLine}
            accent={accent}
          />
          <ReviewRow
            label={t("review.name")}
            value={getValues("customerName") || "—"}
            accent={accent}
          />
          <ReviewRow
            label={t("review.email")}
            value={getValues("customerEmail") || "—"}
            accent={accent}
          />
          {estimate !== null && (
            <ReviewRow
              label={t("review.estPrice")}
              value={`€ ${estimate.toFixed(2)}`}
              accent={accent}
              highlight
            />
          )}
          <ReviewRow
            label={t("review.payMethod")}
            value={isOnline ? t("pay.online") : t("pay.location")}
            accent={accent}
          />
        </dl>

        <button
          type="button"
          onClick={confirmBooking}
          disabled={pending}
          className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          style={{
            background: accent,
            color: ON_ACCENT,
            boxShadow: `0 4px 14px -4px ${accent}80`,
          }}
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t("review.busy")}
            </>
          ) : isOnline ? (
            <>
              {t("review.continuePay")}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </>
          ) : (
            <>
              {t("review.confirm")}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          {isOnline
            ? t("review.redirectNote")
            : t("review.locationNote", { org: orgName })}
        </p>
      </div>
    );
  }

  const showItemPicker =
    !fixedItem && (!itemOptions || itemOptions.length > 0);

  const formatDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const isUnavailable = (date: Date) =>
    unavailableDates.has(formatDateKey(date));

  const isAvailable = (date: Date) => {
    if (date < today) return false;
    if (date > lookaheadEnd) return false;
    return !unavailableDates.has(formatDateKey(date));
  };

  // Eén-dag selectie — geen aparte from/to meer.
  const displayDate = date ?? null;

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-5"
      style={{ ["--rdp-accent-color" as string]: accent }}
    >
      {!fixedItem && itemOptions && itemOptions.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-card/40 px-4 py-6 text-center text-sm text-muted-foreground">
          {t("form.noItems")}
        </div>
      )}

      {formStep === "when" && (
        <>
      {showItemPicker && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="itemId">{t("form.whichItem")}</Label>
          <select
            id="itemId"
            {...register("itemId")}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-invalid={Boolean(errors.itemId) || undefined}
          >
            <option value="">{t("form.chooseItem")}</option>
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
      <Section icon={CalendarDays} accent={accent} title={t("sec.when")}>
        {/* Gekozen dag (één samenvatting-chip; één-dag boeking) */}
        <div className="mb-3 rounded-lg border border-border bg-muted/30 p-2">
          <DateChip
            label={t("sec.when")}
            date={displayDate}
            time={
              startTime && endTime ? `${startTime} — ${endTime}` : startTime
            }
            placeholder={t("chip.pickDay")}
            accent={accent}
            active={Boolean(displayDate)}
          />
        </div>

        <div className="rounded-xl border border-border bg-card p-2 sm:p-3">
          <div className="flex justify-center">
            <DayPicker
              mode="single"
              selected={date}
              onSelect={setDate}
              numberOfMonths={1}
              weekStartsOn={1}
              locale={df}
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
          </div>
          <div className="mt-2 flex items-center justify-center gap-4 border-t border-border pt-2 text-[10px] font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-[oklch(0.78_0.13_145)]" />
              {t("cal.available")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-[oklch(0.72_0.16_25)]" />
              {t("cal.full")}
            </span>
            {availabilityLoading && (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="size-2.5 animate-spin" />
                {t("cal.loading")}
              </span>
            )}
          </div>
        </div>

        {/* Time slots — verborgen voor per-dag items (interval = 1440) */}
        {slotConfig.intervalMinutes !== 1440 && (
          <div className="mt-4 flex flex-col gap-4">
            <SlotGrid
              label={t("slot.start")}
              value={startTime}
              onChange={onPickStart}
              rangeFromDate={date ?? null}
              rangeToDate={date ?? null}
              cfg={slotConfig}
              bookings={bookings}
              isStart
              otherTime={endTime}
              accent={accent}
            />
            <SlotGrid
              label={t("slot.end")}
              value={endTime}
              onChange={onPickEnd}
              rangeFromDate={date ?? null}
              rangeToDate={date ?? null}
              cfg={slotConfig}
              bookings={bookings}
              isStart={false}
              otherTime={startTime}
              accent={accent}
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
                {t("price.estimate")}
              </p>
              <p
                className="text-lg font-semibold tabular-nums leading-tight"
                style={{ color: accent }}
              >
                € {estimate.toFixed(2)}
              </p>
            </div>
            <p className="text-[10px] leading-snug text-muted-foreground">
              {t("price.finalBy", { org: orgName })}
            </p>
          </div>
        )}
      </Section>

          <button
            type="button"
            onClick={goToDetails}
            className="group relative mt-2 inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-xl px-6 text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0"
            style={{
              background: accent,
              color: ON_ACCENT,
              boxShadow: `0 4px 14px -4px ${accent}80`,
            }}
          >
            {t("nav.next")}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </>
      )}

      {formStep === "details" && (
        <>
          <button
            type="button"
            onClick={() => {
              setFormStep("when");
              onPhaseChange?.("when");
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowRight className="size-3 rotate-180" />
            {t("nav.back")}
          </button>

      {/* Wie ben je */}
      <Section icon={User} accent={accent} title={t("sec.you")}>
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label={t("field.name")}
              autoComplete="name"
              error={errors.customerName?.message}
              {...register("customerName")}
            />
            <FormField
              label={t("field.email")}
              type="email"
              autoComplete="email"
              error={errors.customerEmail?.message}
              {...register("customerEmail")}
            />
          </div>

          <FormField
            label={t("field.phone")}
            type="tel"
            autoComplete="tel"
            error={errors.customerPhone?.message}
            {...register("customerPhone")}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes" className="text-xs">
              {t("field.notes")}
            </Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder={t("field.notesPlaceholder")}
              aria-invalid={Boolean(errors.notes) || undefined}
              {...register("notes")}
            />
            {errors.notes && (
              <p className="text-xs font-medium text-destructive">{errors.notes.message}</p>
            )}
          </div>
        </div>
      </Section>

      {/* Betaalkeuze. Alleen de methodes die de tenant aan heeft. Bij twee
          opties is een expliciete keuze verplicht; bij één is 'ie al voorgeselecteerd. */}
      {(() => {
        const bothAvailable =
          locationPaymentAvailable && onlinePaymentAvailable;
        return (
          <Section icon={Wallet} accent={accent} title={t("sec.pay")}>
            <div
              className={
                bothAvailable ? "grid gap-2 sm:grid-cols-2" : "grid gap-2"
              }
            >
              {locationPaymentAvailable && (
                <PayChoiceCard
                  icon={MapPin}
                  title={t("pay.location")}
                  description={t("pay.locationDesc")}
                  active={paymentChoice === "location"}
                  onClick={() => setPaymentChoice("location")}
                  accent={accent}
                />
              )}
              {onlinePaymentAvailable && (
                <PayChoiceCard
                  icon={CreditCard}
                  title={t("pay.online")}
                  description={t("pay.onlineDesc")}
                  active={paymentChoice === "online"}
                  onClick={() => setPaymentChoice("online")}
                  accent={accent}
                />
              )}
            </div>
            {bothAvailable && !paymentChoice && (
              <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                {t("pay.chooseToFinish")}
              </p>
            )}
          </Section>
        );
      })()}

      <button
        type="submit"
        disabled={pending || !paymentChoice}
        className="group relative mt-2 inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-xl px-6 text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        style={{
          background: accent,
          color: ON_ACCENT,
          boxShadow: `0 4px 14px -4px ${accent}80`,
        }}
      >
        {t("submit.book")}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </button>

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        {t("submit.nextStep")}
      </p>
        </>
      )}
    </form>
  );
}

function PayChoiceCard({
  icon: Icon,
  title,
  description,
  active,
  onClick,
  accent,
}: {
  icon: typeof MapPin;
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
  accent: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-1.5 rounded-xl border p-3.5 text-left transition-all"
      style={{
        borderColor: active ? accent : "var(--border)",
        background: active ? `${accent}0D` : "transparent",
        boxShadow: active ? `inset 0 0 0 1px ${accent}55` : undefined,
      }}
    >
      <span
        className="grid size-8 place-items-center rounded-md"
        style={{
          background: active ? accent : `${accent}15`,
          color: active ? ON_ACCENT : accent,
        }}
      >
        <Icon className="size-4" />
      </span>
      <span className="text-sm font-semibold tracking-tight">{title}</span>
      <span className="text-[11px] leading-relaxed text-muted-foreground">
        {description}
      </span>
    </button>
  );
}

function ReviewRow({
  label,
  value,
  accent,
  highlight,
}: {
  label: string;
  value: string;
  accent: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3 last:border-b-0">
      <span className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
        {label}
      </span>
      <span
        className="text-right text-sm font-medium tabular-nums"
        style={highlight ? { color: accent, fontWeight: 700 } : undefined}
      >
        {value}
      </span>
    </div>
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
  const { df } = useWidgetI18n();
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
          {format(date, "d MMM", { locale: df })}
          {time && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground tabular-nums">
              · {time}
            </span>
          )}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">{placeholder}</p>
      )}
    </div>
  );
}

function SlotGrid({
  label,
  value,
  onChange,
  rangeFromDate,
  rangeToDate,
  cfg,
  bookings,
  isStart,
  otherTime,
  accent,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rangeFromDate: Date | null;
  rangeToDate: Date | null;
  cfg: SlotConfig;
  bookings: BookingInterval[];
  isStart: boolean;
  otherTime: string;
  accent: string;
}) {
  const slots = useMemo(() => generateSlots(cfg), [cfg]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
          {label}
        </span>
        <span className="text-[10px] font-semibold tracking-wide tabular-nums" style={{ color: accent }}>
          {value}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
        {slots.map((slot) => {
          const otherSet = otherTime !== "";
          const fromD = rangeFromDate;
          const toD = rangeToDate ?? rangeFromDate;

          // Tijd-volgorde wordt NIET op slot-niveau afgedwongen: anders zit
          // je vast aan een eerdere keuze (kun je starttijd niet meer naar
          // achter zetten zonder eerst de eindtijd te wissen). De parent
          // ledigt zelf de tegenhanger zodra de keuze "omdraait".

          // Eén symmetrische regel: een uur-slot staat voor het tijdvak
          // [slot, slot+interval). Als dat tijdvak een bestaande boeking
          // raakt → uitgegrijsd, in zowel start- als eind-grid. Zo zie je
          // direct welke uren al bezet zijn, zonder eerst iets te klikken.
          // Daarbovenop blokkeren we, zodra ook de tegenhanger gekozen is,
          // élk gekozen totaal-bereik dat over een boeking heen valt.
          let overlap = false;
          if (fromD && toD) {
            const slotDay = isStart ? fromD : toD;
            const slotStartAbs = atTimeMs(slotDay, slot);
            const slotEndAbs = slotStartAbs + cfg.intervalMinutes * 60_000;
            overlap = rangeOverlapsBooking(slotStartAbs, slotEndAbs, bookings);
            if (!overlap && otherSet) {
              const startAbs = isStart
                ? slotStartAbs
                : atTimeMs(fromD, otherTime);
              const endAbs = isStart
                ? atTimeMs(toD, otherTime)
                : slotStartAbs;
              if (endAbs > startAbs) {
                overlap = rangeOverlapsBooking(startAbs, endAbs, bookings);
              }
            }
          }

          const disabled = overlap;
          const selected = value === slot;
          return (
            <button
              key={slot}
              type="button"
              disabled={disabled}
              onClick={() => onChange(slot)}
              title={overlap ? "Vol" : undefined}
              className={`h-9 rounded-md border text-xs font-semibold tabular-nums transition-all ${
                selected
                  ? "border-transparent shadow-sm"
                  : disabled
                    ? "cursor-not-allowed border-dashed border-border/60 bg-muted/20 text-muted-foreground/40 line-through"
                    : "border-border bg-background hover:-translate-y-0.5 hover:shadow-sm"
              }`}
              style={
                selected
                  ? {
                      background: accent,
                      color: ON_ACCENT,
                      boxShadow: `0 2px 8px -2px ${accent}80`,
                    }
                  : !disabled
                    ? { borderColor: undefined }
                    : undefined
              }
              onMouseEnter={(e) => {
                if (!selected && !disabled) {
                  e.currentTarget.style.borderColor = `${accent}66`;
                  e.currentTarget.style.color = accent;
                }
              }}
              onMouseLeave={(e) => {
                if (!selected && !disabled) {
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

function hhmmToMin(s: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return 0;
  return Number(m[1]) * 60 + Number(m[2]);
}
