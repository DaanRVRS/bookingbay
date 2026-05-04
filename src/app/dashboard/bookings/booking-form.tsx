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
import { CustomerDialog } from "@/app/dashboard/customers/customer-dialog";
import { z } from "zod";
import {
  bookingCreateSchema,
  bookingStatusValues,
  STATUS_LABELS,
  type BookingCreateInput,
} from "@/lib/bookings/schemas";

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
  pricePerHour: number | null;
  pricePerDay: number | null;
  pricePerWeek: number | null;
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
}

interface Props {
  items: ItemOpt[];
  customers: CustomerOpt[];
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

  const selectedItem = useMemo(
    () => items.find((i) => i.id === itemId) ?? null,
    [items, itemId],
  );

  // Calculate suggested price from duration
  const computeSuggestion = () => {
    if (!selectedItem || !startAt || !endAt) return null;
    const start = new Date(String(startAt));
    const end = new Date(String(endAt));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;

    const ms = end.getTime() - start.getTime();
    const hours = ms / (1000 * 60 * 60);
    const days = ms / (1000 * 60 * 60 * 24);

    if (days >= 7 && selectedItem.pricePerWeek) {
      return Math.round(Math.ceil(days / 7) * selectedItem.pricePerWeek * 100) / 100;
    }
    if (days >= 1 && selectedItem.pricePerDay) {
      return Math.round(Math.ceil(days) * selectedItem.pricePerDay * 100) / 100;
    }
    if (selectedItem.pricePerHour) {
      return Math.round(Math.ceil(hours) * selectedItem.pricePerHour * 100) / 100;
    }
    if (selectedItem.pricePerDay) {
      return Math.round(Math.ceil(days) * selectedItem.pricePerDay * 100) / 100;
    }
    return null;
  };

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
    startTransition(async () => {
      const res = existing
        ? await updateBookingAction({ ...values, id: existing.id })
        : await createBookingAction(values);
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
            <Select
              items={customers.map((c) => ({ value: c.id, label: c.name }))}
              value={customerId || undefined}
              onValueChange={(v) => v && setValue("customerId", v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Kies of maak een klant" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.customerId?.message && (
              <p className="text-xs font-medium text-destructive">{errors.customerId.message}</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Tijdvak</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FormField
            label="Start"
            type="datetime-local"
            error={errors.startAt?.message as string | undefined}
            {...register("startAt")}
          />
          <FormField
            label="Einde"
            type="datetime-local"
            error={errors.endAt?.message as string | undefined}
            {...register("endAt")}
          />
        </div>

        <AvailabilityHint state={availability} />
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Status & prijs</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Select
              items={bookingStatusValues.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
              value={status}
              onValueChange={(v) => v && setValue("status", v as BookingCreateInput["status"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {bookingStatusValues.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="totalPrice">Totaalbedrag</Label>
              {selectedItem && (
                <button
                  type="button"
                  onClick={() => {
                    const sug = computeSuggestion();
                    if (sug != null) setValue("totalPrice", sug, { shouldValidate: true });
                    else toast("Stel eerst een prijs in op het item");
                  }}
                  className="text-[11px] font-medium text-primary hover:underline"
                >
                  Bereken
                </button>
              )}
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                €
              </span>
              <Input
                id="totalPrice"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                className="pl-7"
                {...register("totalPrice")}
              />
            </div>
            {errors.totalPrice?.message && (
              <p className="text-xs font-medium text-destructive">{errors.totalPrice.message}</p>
            )}
          </div>
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
