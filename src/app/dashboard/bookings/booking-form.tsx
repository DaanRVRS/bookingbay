"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/auth/FormField";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { CustomerDialog } from "@/app/dashboard/customers/customer-dialog";
import {
  DateTimePicker,
  type DateTimeValue,
} from "@/components/booking-widget/date-time-picker";
import { z } from "zod";
import {
  bookingCreateSchema,
  type BookingCreateInput,
} from "@/lib/bookings/schemas";
import {
  sumAddons,
  addonAppliesToCategory,
  estimateRentalSubtotal,
  type BookingAddonLine,
} from "@/lib/bookings/price";
import type { AddonOption } from "@/lib/tenants/queries";

type BookingFormValues = z.input<typeof bookingCreateSchema>;
import {
  createBookingAction,
  updateBookingAction,
  checkBookingAvailability,
} from "@/lib/bookings/actions";

interface ItemOpt {
  id: string;
  name: string;
  categoryName: string;
  /** Categorie + evt. parent — voor add-on-matching. */
  categoryIds?: string[];
  pricePerUnit: number | null;
  bookingIntervalMinutes: number;
  cleaningFee: number | null;
}

interface CustomerOpt {
  id: string;
  name: string;
  email: string | null;
}

interface Existing {
  id: string;
  itemId: string;
  customerId: string;
  startAt: string;
  endAt: string;
  status: BookingCreateInput["status"];
  totalPrice: number;
  notes: string;
  /** Eerder gekozen add-ons (snapshot). Null = geen. */
  addons?: BookingAddonLine[] | null;
}

interface Props {
  items: ItemOpt[];
  customers: CustomerOpt[];
  /** Optionele extra's die de org aanbiedt. */
  addons?: AddonOption[];
  /** Slug van de eigen organisatie — voor /api/public/availability. */
  orgSlug: string;
  /** Aksent-kleur voor de kalender/slot-grid. */
  accent?: string;
  existing?: Existing;
  defaultItemId?: string;
  defaultCustomerId?: string;
  defaultStartAt?: string;
  defaultEndAt?: string;
  quickAddCustomer?: { name: string; email: string; phone: string };
}

function toLocalIsoNoTz(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultStart(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return toLocalIsoNoTz(d);
}

function defaultEnd(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 4);
  return toLocalIsoNoTz(d);
}

function tryParseLocalIso(s: string | undefined): string | null {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return toLocalIsoNoTz(d);
}

export function BookingForm({
  items,
  customers: initialCustomers,
  addons: addonOptions = [],
  orgSlug,
  accent,
  existing,
  defaultItemId,
  defaultCustomerId,
  defaultStartAt,
  defaultEndAt,
  quickAddCustomer,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [customers, setCustomers] = useState(initialCustomers);
  const [addonQty, setAddonQty] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const a of existing?.addons ?? []) init[a.itemId] = a.quantity;
    return init;
  });
  const [availability, setAvailability] = useState<{
    state: "idle" | "checking" | "available" | "conflict";
    message?: string;
    overlapping?: { id: string; customerName: string; startAt: string; endAt: string }[];
  }>({ state: "idle" });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    setValue,
    watch,
    clearErrors,
  } = useForm<BookingFormValues, unknown, BookingCreateInput>({
    resolver: zodResolver(bookingCreateSchema),
    defaultValues: {
      itemId: existing?.itemId ?? defaultItemId ?? items[0]?.id ?? "",
      customerId: existing?.customerId ?? defaultCustomerId ?? "",
      startAt: existing
        ? toLocalIsoNoTz(new Date(existing.startAt))
        : (tryParseLocalIso(defaultStartAt) ?? defaultStart()),
      endAt: existing
        ? toLocalIsoNoTz(new Date(existing.endAt))
        : (tryParseLocalIso(defaultEndAt) ?? defaultEnd()),
      status: existing?.status ?? "CONFIRMED",
      totalPrice: existing?.totalPrice ?? 0,
      notes: existing?.notes ?? "",
    },
  });

  const itemId = watch("itemId");
  const customerId = watch("customerId");
  const startAt = watch("startAt");
  const endAt = watch("endAt");
  const status = watch("status");

  // Datum/tijd-state voor de DateTimePicker — gesynced naar RHF startAt/endAt.
  const [dt, setDt] = useState<DateTimeValue>(() => {
    const parse = (loc: string): { d: Date | null; t: string } => {
      const [day, time] = loc.split("T");
      if (!day || !time) return { d: null, t: "" };
      const [y, m, d] = day.split("-").map(Number);
      return { d: new Date(y, (m ?? 1) - 1, d ?? 1), t: time.slice(0, 5) };
    };
    const s = parse(String(startAt ?? ""));
    const e = parse(String(endAt ?? ""));
    const sameDay =
      s.d &&
      e.d &&
      s.d.getFullYear() === e.d.getFullYear() &&
      s.d.getMonth() === e.d.getMonth() &&
      s.d.getDate() === e.d.getDate();
    return {
      date: s.d,
      startTime: s.t,
      endTime: sameDay ? e.t : "",
    };
  });

  useEffect(() => {
    const fmtDay = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const sIso =
      dt.date && dt.startTime ? `${fmtDay(dt.date)}T${dt.startTime}` : "";
    const eIso =
      dt.date && dt.endTime ? `${fmtDay(dt.date)}T${dt.endTime}` : "";
    // Stille setValue tijdens het kiezen — anders zet zod's cross-field
    // refine een "Ongeldige datum" terwijl de tegenhanger nog leeg is,
    // en die foutmelding blijft soms hangen. Pas bij submit valideren;
    // bij complete range maken we eventuele oude fouten leeg.
    setValue("startAt", sIso, { shouldValidate: false });
    setValue("endAt", eIso, { shouldValidate: false });
    if (sIso && eIso) {
      clearErrors(["startAt", "endAt"]);
    }
  }, [dt, setValue, clearErrors]);

  const selectedItem = useMemo(
    () => items.find((i) => i.id === itemId) ?? null,
    [items, itemId],
  );

  // Add-ons gefilterd op de categorie van het gekozen item — zelfde regels
  // als de widget en de server (categoryIds null/leeg = geldt overal).
  const applicableAddons = useMemo(
    () =>
      addonOptions.filter((a) =>
        addonAppliesToCategory(a.categoryIds, selectedItem?.categoryIds ?? []),
      ),
    [addonOptions, selectedItem],
  );

  // Gekozen add-ons als prijsregels + hun totaal. Server telt deze opnieuw op
  // bovenop het item-subtotaal (totalPrice hieronder = alleen het item-deel).
  const addonLines = useMemo<BookingAddonLine[]>(
    () =>
      applicableAddons
        .map((a) => ({
          itemId: a.id,
          name: a.name,
          unitPrice: a.price,
          quantity: addonQty[a.id] ?? 0,
        }))
        .filter((l) => l.quantity > 0),
    [applicableAddons, addonQty],
  );
  const addonsTotal = useMemo(() => sumAddons(addonLines), [addonLines]);
  // Schoonmaakkosten van het gekozen item — server telt ze bovenop het
  // item-subtotaal (net als de extra's), dus tonen we ze hier ook apart.
  const cleaningFee = selectedItem?.cleaningFee ?? 0;

  // Prijs-suggestie op basis van duur — zelfde gedeelde formule als de
  // publieke widget en de server, zodat de bedragen exact matchen.
  const computeSuggestion = () => {
    if (!selectedItem || !startAt || !endAt) return null;
    const start = new Date(String(startAt));
    const end = new Date(String(endAt));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;

    return estimateRentalSubtotal({
      startMs: start.getTime(),
      endMs: end.getTime(),
      pricePerUnit: selectedItem.pricePerUnit,
      bookingIntervalMinutes: selectedItem.bookingIntervalMinutes,
    });
  };

  // totalPrice = alleen het item-subtotaal (prijs × duur). Live herberekend
  // bij item-/tijd-wijziging, ook bij bewerken — de extra's worden er
  // server-side bovenop geteld, dus dit veld blijft puur het item-deel.
  useEffect(() => {
    const base = computeSuggestion();
    setValue("totalPrice", base ?? 0, { shouldValidate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItem?.id, startAt, endAt]);

  // Live availability check (debounced)
  useEffect(() => {
    if (!itemId || !startAt || !endAt || status === "CANCELED") {
      setAvailability({ state: "idle" });
      return;
    }
    setAvailability({ state: "checking" });
    const handle = setTimeout(async () => {
      try {
        const result = await checkBookingAvailability({
          itemId,
          startAt: new Date(String(startAt)),
          endAt: new Date(String(endAt)),
          excludeBookingId: existing?.id,
        });
        if (result.available) {
          setAvailability({ state: "available" });
        } else {
          setAvailability({
            state: "conflict",
            message: result.message,
            overlapping: result.overlapping,
          });
        }
      } catch {
        setAvailability({ state: "idle" });
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [itemId, startAt, endAt, status, existing?.id]);

  const onSubmit = handleSubmit((values) => {
    const addonPayload = addonLines.map((l) => ({
      itemId: l.itemId,
      quantity: l.quantity,
    }));
    startTransition(async () => {
      const res = existing
        ? await updateBookingAction({ ...values, addons: addonPayload, id: existing.id })
        : await createBookingAction({ ...values, addons: addonPayload });
      if (!res.ok) {
        if (res.fieldErrors) {
          for (const [k, v] of Object.entries(res.fieldErrors)) {
            setError(k as keyof BookingFormValues, { message: v });
          }
        }
        toast.error(res.error);
        return;
      }
      toast.success(existing ? "Boeking bijgewerkt" : "Boeking aangemaakt");
      router.push("/dashboard/bookings");
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Item & klant</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Item</Label>
            <Select
              items={items.map((i) => ({ value: i.id, label: i.name }))}
              value={itemId}
              onValueChange={(v) => v && setValue("itemId", v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Kies een item" />
              </SelectTrigger>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.itemId?.message && (
              <p className="text-xs font-medium text-destructive">{errors.itemId.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label>Klant</Label>
              <CustomerDialog
                trigger={
                  <button
                    type="button"
                    className="text-[11px] font-medium text-primary hover:underline"
                  >
                    + Nieuw
                  </button>
                }
                onCreated={(c) => {
                  setCustomers((prev) => [...prev, { id: c.id, name: c.name, email: null }]);
                  setValue("customerId", c.id, { shouldValidate: true });
                }}
              />
            </div>
            <Combobox
              items={customers.map((c) => ({
                value: c.id,
                label: c.email ? `${c.name} · ${c.email}` : c.name,
              }))}
              value={customerId || null}
              onValueChange={(v) =>
                setValue("customerId", v ?? "", { shouldValidate: true })
              }
              placeholder="Zoek of kies een klant…"
              emptyText="Geen klant gevonden"
              invalid={Boolean(errors.customerId)}
            />
            {errors.customerId?.message && (
              <p className="text-xs font-medium text-destructive">{errors.customerId.message}</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Tijdvak</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Zelfde kalender + uur-grid als klanten zien in de boek-widget —
          uren die al bezet zijn (boekingen of gekoppelde agenda) staan
          direct uitgegrijsd.
        </p>
        <div className="mt-4">
          <DateTimePicker
            slug={orgSlug}
            itemId={itemId || null}
            accent={accent}
            value={dt}
            onChange={setDt}
            excludeBookingId={existing?.id}
          />
        </div>

        {(errors.startAt?.message || errors.endAt?.message) && (
          <p className="mt-2 text-xs font-medium text-destructive">
            {(errors.startAt?.message as string | undefined) ||
              (errors.endAt?.message as string | undefined)}
          </p>
        )}

        <AvailabilityHint state={availability} />
      </div>

      {applicableAddons.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold">Extra&apos;s</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Optionele add-ons die je bij deze boeking kunt toevoegen.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {applicableAddons.map((a) => {
              const qty = addonQty[a.id] ?? 0;
              return (
                <div
                  key={a.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 ${
                    qty > 0 ? "border-primary/40 bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="text-[11px] font-semibold tabular-nums text-primary">
                      € {a.price.toFixed(2)} p/st
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setAddonQty((p) => ({ ...p, [a.id]: Math.max(0, qty - 1) }))
                      }
                      disabled={qty <= 0}
                      aria-label="Minder"
                      className="grid size-7 place-items-center rounded-md border border-border text-base leading-none hover:bg-muted disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-semibold tabular-nums">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setAddonQty((p) => ({ ...p, [a.id]: Math.min(99, qty + 1) }))
                      }
                      aria-label="Meer"
                      className="grid size-7 place-items-center rounded-md bg-primary text-base leading-none text-primary-foreground"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Bedrag & notities</h2>

        {/* Status wordt afgeleid van de tijd (Gereserveerd → Bezig →
            Voltooid) of via "Annuleer boeking" — niet handmatig instelbaar.
            We sturen de bestaande waarde stilletjes mee. */}
        <input type="hidden" {...register("status")} />

        <div className="mt-4 flex flex-col gap-1.5">
          <Label htmlFor="totalPrice">
            {addonsTotal > 0 || cleaningFee > 0 ? "Item-bedrag" : "Totaalbedrag"}
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
              €
            </span>
            <Input
              id="totalPrice"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              className="pl-7 bg-muted/40 cursor-not-allowed"
              readOnly
              tabIndex={-1}
              {...register("totalPrice")}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Automatisch berekend op basis van item-prijs × duur — niet
            handmatig aanpasbaar.
          </p>
          {errors.totalPrice?.message && (
            <p className="text-xs font-medium text-destructive">
              {errors.totalPrice.message}
            </p>
          )}
          {(addonsTotal > 0 || cleaningFee > 0) && (
            <div className="mt-1 space-y-1 rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Item</span>
                <span className="tabular-nums">
                  € {Number(watch("totalPrice") || 0).toFixed(2)}
                </span>
              </div>
              {cleaningFee > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Schoonmaak</span>
                  <span className="tabular-nums">€ {cleaningFee.toFixed(2)}</span>
                </div>
              )}
              {addonsTotal > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Extra&apos;s</span>
                  <span className="tabular-nums">€ {addonsTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-1 font-semibold">
                <span>Totaal</span>
                <span className="tabular-nums">
                  € {(Number(watch("totalPrice") || 0) + cleaningFee + addonsTotal).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <Label htmlFor="notes">Notities</Label>
          <Textarea id="notes" rows={2} placeholder="Optioneel" {...register("notes")} />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/bookings")}
          className="w-full sm:w-auto"
        >
          Annuleren
        </Button>
        <Button
          type="submit"
          disabled={pending || availability.state === "conflict"}
          className="w-full sm:w-auto"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {existing ? "Opslaan" : "Boeking aanmaken"}
        </Button>
      </div>
    </form>
  );
}

function AvailabilityHint({
  state,
}: {
  state: {
    state: "idle" | "checking" | "available" | "conflict";
    message?: string;
    overlapping?: { id: string; customerName: string; startAt: string; endAt: string }[];
  };
}) {
  if (state.state === "idle") return null;
  if (state.state === "checking") {
    return (
      <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Beschikbaarheid checken…
      </p>
    );
  }
  if (state.state === "available") {
    return (
      <p className="mt-3 flex items-center gap-2 rounded-lg border border-[oklch(0.7_0.13_150)]/30 bg-[oklch(0.7_0.13_150)]/8 px-3 py-2 text-xs text-[oklch(0.5_0.14_150)]">
        <CheckCircle2 className="size-3.5" />
        Item is beschikbaar in dit tijdvak.
      </p>
    );
  }
  return (
    <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/8 p-3 text-xs">
      <p className="flex items-center gap-2 font-medium text-destructive">
        <AlertTriangle className="size-3.5" />
        {state.message ?? "Conflict in deze periode"}
      </p>
      {state.overlapping && state.overlapping.length > 0 && (
        <ul className="mt-2 space-y-0.5 pl-5">
          {state.overlapping.map((o) => (
            <li key={o.id} className="text-muted-foreground">
              {o.customerName} —{" "}
              {new Date(o.startAt).toLocaleString("nl-NL", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              tot{" "}
              {new Date(o.endAt).toLocaleString("nl-NL", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
