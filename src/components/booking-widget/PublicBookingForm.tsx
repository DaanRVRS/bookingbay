"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/auth/FormField";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPublicBookingAction } from "@/lib/bookings/public-actions";
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
  /** When set, item is fixed and not user-selectable (per-item widget). */
  fixedItem?: ItemOption;
  /** When set, user picks item from this list (general widget). */
  itemOptions?: ItemOption[];
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

  const watchedItemId = watch("itemId");
  const watchedStart = watch("startAt");
  const watchedEnd = watch("endAt");

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
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <span
          className="grid size-14 place-items-center rounded-full text-white"
          style={{ background: accent }}
        >
          <CheckCircle2 className="size-7" />
        </span>
        <h3 className="text-xl font-semibold tracking-tight">Aanvraag ontvangen</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          {orgName} bevestigt je boeking zo snel mogelijk per e-mail. Tot snel!
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {fixedItem ? (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Item
          </span>
          <p className="font-medium">{fixedItem.name}</p>
        </div>
      ) : itemOptions && itemOptions.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="itemId">Welk item wil je boeken?</Label>
          <select
            id="itemId"
            {...register("itemId")}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-invalid={Boolean(errors.itemId) || undefined}
          >
            <option value="">— kies een item —</option>
            {itemOptions.map((it) => (
              <option key={it.id} value={it.id}>
                {it.name}
              </option>
            ))}
          </select>
          {errors.itemId && (
            <p className="text-xs font-medium text-destructive">{errors.itemId.message}</p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-card/40 px-4 py-6 text-center text-sm text-muted-foreground">
          Geen items beschikbaar om te boeken.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          label="Vanaf"
          type="datetime-local"
          error={errors.startAt?.message}
          {...register("startAt")}
        />
        <FormField
          label="Tot"
          type="datetime-local"
          error={errors.endAt?.message}
          {...register("endAt")}
        />
      </div>

      {estimate !== null && (
        <div
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          style={{ borderColor: `${accent}40` }}
        >
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Geschatte prijs
          </span>
          <p className="font-semibold tabular-nums" style={{ color: accent }}>
            € {estimate.toFixed(2)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Definitieve prijs wordt bevestigd door {orgName}.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          label="Je naam"
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
        <Label htmlFor="notes">Opmerkingen (optioneel)</Label>
        <Textarea
          id="notes"
          rows={3}
          placeholder="Bv. ophaal- of bezorgvoorkeur, accessoires, ..."
          aria-invalid={Boolean(errors.notes) || undefined}
          {...register("notes")}
        />
        {errors.notes && (
          <p className="text-xs font-medium text-destructive">{errors.notes.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-lg px-6 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        style={{ background: accent }}
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Boeking aanvragen
      </button>

      <p className="text-[11px] text-muted-foreground">
        Door op verzenden te klikken stuur je een aanvraag naar {orgName}. Geen geld wordt nu
        afgeschreven — bevestiging volgt per e-mail.
      </p>
    </form>
  );
}
