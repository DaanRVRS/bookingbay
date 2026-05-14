"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2, Clock, Loader2, User } from "lucide-react";
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
  fixedItem?: ItemOption;
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

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
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

      {/* Wanneer */}
      <Section icon={Clock} accent={accent} title="Wanneer">
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
  icon: typeof Clock;
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
