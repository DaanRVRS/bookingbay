"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/auth/FormField";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { z } from "zod";
import { itemCreateSchema, type ItemCreateInput } from "@/lib/items/schemas";
import { createItemAction, updateItemAction, deleteItemAction } from "@/lib/items/actions";
import { CategoryDialog } from "@/app/dashboard/categories/category-dialog";
import { ImageUploader } from "@/components/dashboard/ImageUploader";
import { unitLabel, isWholeDayUnit } from "@/lib/bookings/price";
import {
  DAY_LABELS_NL,
  type BusinessHours,
} from "@/lib/business-hours/schemas";

type ItemFormValues = z.input<typeof itemCreateSchema>;

const INTERVAL_OPTIONS = [
  { value: 15, label: "Per 15 minuten" },
  { value: 30, label: "Per 30 minuten" },
  { value: 60, label: "Per uur" },
  { value: 90, label: "Per 1u30" },
  { value: 120, label: "Per 2 uur" },
  { value: 240, label: "Per 4 uur" },
  { value: 1440, label: "Per dag (geen tijdkeuze)" },
  // "Per week" (10080) komt terug zodra de widget meerdaagse selectie heeft —
  // met de huidige één-dag-kalender zou een week-item een volle week rekenen
  // voor één gekozen dag. De formule/isWholeDayUnit ondersteunen 10080 al.
];

function minutesToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function hhmmToMinutes(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h < 0 || h > 24 || mm < 0 || mm >= 60) return null;
  return h * 60 + mm;
}

function formatIntervalLabel(min: number): string {
  if (min === 10080) return "per week";
  if (min === 1440) return "per dag";
  if (min === 60) return "1 uur";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} uur` : `${h}u${String(m).padStart(2, "0")}`;
}

interface Existing {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  imageUrl: string | null;
  pricePerUnit: number | null;
  deposit: number | null;
  cleaningFee: number | null;
  captainFee: number | null;
  fuelFee: number | null;
  quantity: number;
  isActive: boolean;
  isAddon: boolean;
  addonPrice: number | null;
  addonCategoryIds: string[] | null;
  bookingIntervalMinutes: number;
  bookingWindowStartMin: number;
  bookingWindowEndMin: number;
  followsOrgHours: boolean;
}

interface Props {
  categories: { id: string; name: string; parentId: string | null }[];
  /** Organisatie-openingstijden — read-only getoond wanneer een item ze volgt. */
  orgBusinessHours: BusinessHours | null;
  existing?: Existing;
}

export function ItemForm({ categories, orgBusinessHours, existing }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    setValue,
    watch,
  } = useForm<ItemFormValues, unknown, ItemCreateInput>({
    resolver: zodResolver(itemCreateSchema),
    defaultValues: {
      name: existing?.name ?? "",
      description: existing?.description ?? "",
      categoryId: existing?.categoryId ?? categories[0]?.id ?? "",
      imageUrl: existing?.imageUrl ?? "",
      pricePerUnit: existing?.pricePerUnit ?? null,
      deposit: existing?.deposit ?? null,
      cleaningFee: existing?.cleaningFee ?? null,
      captainFee: existing?.captainFee ?? null,
      fuelFee: existing?.fuelFee ?? null,
      quantity: existing?.quantity ?? 1,
      isActive: existing?.isActive ?? true,
      isAddon: existing?.isAddon ?? false,
      addonPrice: existing?.addonPrice ?? null,
      addonCategoryIds: existing?.addonCategoryIds ?? null,
      bookingIntervalMinutes: existing?.bookingIntervalMinutes ?? 60,
      bookingWindowStartMin: existing?.bookingWindowStartMin ?? 540,
      bookingWindowEndMin: existing?.bookingWindowEndMin ?? 1080,
      followsOrgHours: existing?.followsOrgHours ?? true,
    },
  });

  const categoryId = watch("categoryId");
  const isActive = watch("isActive");
  const isAddon = Boolean(watch("isAddon"));
  const addonCategoryIds =
    (watch("addonCategoryIds") as string[] | null | undefined) ?? null;
  const quantityRaw = Number(watch("quantity") ?? 1);
  // quantity 0 = voorraad n.v.t. (alleen voor add-ons).
  const stockNa = isAddon && quantityRaw === 0;
  const imageUrl = watch("imageUrl") ?? null;
  // Standaard volgt een item de organisatie-openingstijden; uit = eigen venster.
  const followsOrgHours = Boolean(watch("followsOrgHours") ?? true);
  const bookingIntervalMinutes = Number(watch("bookingIntervalMinutes") ?? 60);
  const bookingWindowStartMin = Number(watch("bookingWindowStartMin") ?? 540);
  const bookingWindowEndMin = Number(watch("bookingWindowEndMin") ?? 1080);
  // Dag- of week-eenheid: geen tijdkeuze, klanten kiezen alleen datums.
  const isWholeDay = isWholeDayUnit(bookingIntervalMinutes);

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const res = existing
        ? await updateItemAction({ ...values, id: existing.id })
        : await createItemAction(values);
      if (!res.ok) {
        if (res.fieldErrors) {
          for (const [k, v] of Object.entries(res.fieldErrors)) {
            setError(k as keyof ItemFormValues, { message: v });
          }
        }
        toast.error(res.error);
        return;
      }
      toast.success(existing ? "Bijgewerkt" : "Item toegevoegd");
      router.push("/dashboard/items");
      router.refresh();
    });
  });

  const onDelete = () => {
    if (!existing) return;
    startTransition(async () => {
      const res = await deleteItemAction(existing.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Verwijderd");
      router.push("/dashboard/items");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Basis</h2>
        <div className="mt-4 flex flex-col gap-4">
          <FormField
            label="Naam"
            placeholder="Bijv. Bavaria 32 — Aurora"
            error={errors.name?.message}
            {...register("name")}
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Beschrijving</Label>
            <Textarea
              id="description"
              placeholder="Komt op de klantsite te staan"
              rows={3}
              {...register("description")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label>Categorie</Label>
              <CategoryDialog
                trigger={
                  <button
                    type="button"
                    className="text-[11px] font-medium text-primary hover:underline"
                  >
                    + Nieuwe categorie
                  </button>
                }
                categories={categories.map((c) => ({
                  id: c.id,
                  name: c.name,
                  parentId: c.parentId,
                }))}
              />
            </div>
            <Select
              items={categories.map((c) => ({ value: c.id, label: c.name }))}
              value={categoryId}
              onValueChange={(v) => v && setValue("categoryId", v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Kies een categorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId?.message && (
              <p className="text-xs font-medium text-destructive">{errors.categoryId.message}</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Type</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Een add-on is geen losse boeking, maar een optionele extra (bijv.
          zwemvest, koelbox, schipper) die klanten kunnen toevoegen bij het
          boeken van een item.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setValue("isAddon", false, { shouldDirty: true })}
            className={`rounded-lg border p-3 text-left transition-colors ${
              !isAddon
                ? "border-primary/40 bg-primary/5"
                : "border-border hover:bg-accent"
            }`}
          >
            <span className="block text-sm font-medium">Normaal item</span>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              Zelfstandig te boeken (boot, fiets, …)
            </span>
          </button>
          <button
            type="button"
            onClick={() => setValue("isAddon", true, { shouldDirty: true })}
            className={`rounded-lg border p-3 text-left transition-colors ${
              isAddon
                ? "border-primary/40 bg-primary/5"
                : "border-border hover:bg-accent"
            }`}
          >
            <span className="block text-sm font-medium">Add-on (extra)</span>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              Optioneel bij te boeken, vaste prijs per stuk
            </span>
          </button>
        </div>
        <input
          type="hidden"
          {...register("isAddon")}
          value={isAddon ? "true" : "false"}
        />

        {/* Bij welke categorieën verschijnt deze add-on. Leeg = overal. */}
        {isAddon && (
          <div className="mt-5 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Beschikbaar bij</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Bij welke categorieën klanten deze extra te zien krijgen.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setValue(
                    "addonCategoryIds",
                    addonCategoryIds === null ? [] : null,
                    { shouldDirty: true },
                  )
                }
                className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                  addonCategoryIds === null ? "bg-primary" : "bg-muted"
                }`}
                aria-pressed={addonCategoryIds === null}
                aria-label="Alle categorieën"
              >
                <span
                  className={`inline-block size-4 transform rounded-full bg-background shadow transition-transform ${
                    addonCategoryIds === null ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
            <p className="mt-2 text-[11px] font-medium text-muted-foreground">
              {addonCategoryIds === null
                ? "Alle categorieën — deze extra verschijnt bij elke boeking."
                : "Alleen bij de aangevinkte categorieën (een hoofdcategorie dekt ook z'n subcategorieën):"}
            </p>
            {addonCategoryIds !== null && (
              <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {categories.map((c) => {
                  const checked = addonCategoryIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        checked
                          ? "border-primary/40 bg-primary/5"
                          : "border-border hover:bg-accent"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...addonCategoryIds, c.id]
                            : addonCategoryIds.filter((id) => id !== c.id);
                          setValue("addonCategoryIds", next, { shouldDirty: true });
                        }}
                        className="size-4 accent-[var(--primary)]"
                      />
                      <span className="truncate">
                        {c.parentId ? `↳ ${c.name}` : c.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Afbeelding</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Wordt op de klantsite gebruikt en in je catalogus-overzicht.
        </p>
        <div className="mt-4">
          <ImageUploader
            value={typeof imageUrl === "string" && imageUrl ? imageUrl : null}
            onChange={(url) => setValue("imageUrl", url ?? "", { shouldValidate: false })}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">{isAddon ? "Prijs" : "Prijzen"}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {isAddon
            ? "Vaste prijs per stuk. Wordt per gekozen aantal bij de boeking opgeteld."
            : "Kies de verhuur-eenheid en zet daar één prijs voor. Het totaal is aantal eenheden × deze prijs. Borg en schoonmaak zijn optioneel."}
        </p>
        {isAddon ? (
          <div className="mt-4 sm:max-w-xs">
            <PriceField
              label="Prijs per stuk"
              name="addonPrice"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-5">
            {/* Verhuur-eenheid bepaalt zowel de prijs-eenheid als de
                boek-stapgrootte — één keuze, één prijs. */}
            <div className="flex flex-col gap-1.5">
              <Label>Verhuur-eenheid</Label>
              <Select
                items={INTERVAL_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
                value={String(bookingIntervalMinutes)}
                onValueChange={(v) => {
                  const n = Number(v);
                  if (Number.isFinite(n)) {
                    setValue("bookingIntervalMinutes", n, { shouldValidate: true, shouldDirty: true });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kies een eenheid" />
                </SelectTrigger>
                <SelectContent>
                  {INTERVAL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" {...register("bookingIntervalMinutes")} />
              <p className="text-[11px] text-muted-foreground">
                Klanten boeken per {unitLabel(bookingIntervalMinutes)} — de prijs
                hieronder geldt per {unitLabel(bookingIntervalMinutes)}.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <PriceField
                label={`Prijs per ${unitLabel(bookingIntervalMinutes)}`}
                name="pricePerUnit"
                register={register}
                watch={watch}
                setValue={setValue}
              />
              <PriceField
                label="Borg (optioneel)"
                name="deposit"
                register={register}
                watch={watch}
                setValue={setValue}
                toggleable
              />
              <PriceField
                label="Schoonmaak (optioneel)"
                name="cleaningFee"
                register={register}
                watch={watch}
                setValue={setValue}
                toggleable
              />
              <PriceField
                label="Kapitein (optioneel)"
                name="captainFee"
                register={register}
                watch={watch}
                setValue={setValue}
                toggleable
              />
              <PriceField
                label="Brandstof (optioneel)"
                name="fuelFee"
                register={register}
                watch={watch}
                setValue={setValue}
                toggleable
              />
            </div>
          </div>
        )}
      </div>

      {!isAddon && !isWholeDay && (
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Reserveer-tijden</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Wanneer kunnen klanten dit item boeken? Ze kiezen start- en eindtijd
          met stapgrootte {formatIntervalLabel(bookingIntervalMinutes)}.
        </p>

        {/* Volg de organisatie-openingstijden, of zet een eigen tijdvenster. */}
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-background/50 p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Algemene openingstijden aanhouden</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {followsOrgHours
                ? "Volgt de tijden uit Instellingen → Organisatie; gesloten dagen zijn niet boekbaar."
                : "Een eigen tijdvenster voor dit item."}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setValue("followsOrgHours", !followsOrgHours, {
                shouldValidate: false,
                shouldDirty: true,
              })
            }
            className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
              followsOrgHours ? "bg-primary" : "bg-muted"
            }`}
            aria-pressed={followsOrgHours}
            aria-label="Algemene openingstijden aanhouden"
          >
            <span
              className={`inline-block size-4 transform rounded-full bg-background shadow transition-transform ${
                followsOrgHours ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
        <input
          type="hidden"
          {...register("followsOrgHours")}
          value={followsOrgHours ? "true" : "false"}
        />

        {followsOrgHours && (
          <div className="mt-4">
            {orgBusinessHours ? (
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-background/50">
                {orgBusinessHours.map((dayHours, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <span className="text-xs font-medium">{DAY_LABELS_NL[i]}</span>
                    <span
                      className={`text-xs tabular-nums ${
                        dayHours.closed
                          ? "text-muted-foreground"
                          : "font-medium text-foreground"
                      }`}
                    >
                      {dayHours.closed
                        ? "Gesloten"
                        : `${dayHours.open || "09:00"} – ${dayHours.close || "17:00"}`}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed border-border bg-background/50 px-3 py-3 text-[11px] text-muted-foreground">
                Je organisatie heeft nog geen openingstijden ingesteld — stel ze in
                onder{" "}
                <Link
                  href="/dashboard/settings/organization"
                  className="font-medium text-primary hover:underline"
                >
                  Instellingen → Organisatie
                </Link>
                . Tot die tijd geldt 09:00–18:00 op elke dag.
              </p>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">
              Deze tijden komen uit je organisatie-instellingen. Wil je voor dit
              item afwijken? Zet de schakelaar uit.
            </p>
          </div>
        )}

        {!followsOrgHours && (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bookingWindowStart">Eerste slot</Label>
              <Input
                id="bookingWindowStart"
                type="time"
                step={60}
                value={minutesToHHMM(bookingWindowStartMin)}
                onChange={(e) => {
                  const m = hhmmToMinutes(e.target.value);
                  if (m != null) {
                    setValue("bookingWindowStartMin", m, { shouldValidate: true, shouldDirty: true });
                  }
                }}
              />
              <input type="hidden" {...register("bookingWindowStartMin")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bookingWindowEnd">Laatste slot</Label>
              <Input
                id="bookingWindowEnd"
                type="time"
                step={60}
                value={minutesToHHMM(bookingWindowEndMin)}
                onChange={(e) => {
                  const m = hhmmToMinutes(e.target.value);
                  if (m != null) {
                    setValue("bookingWindowEndMin", m, { shouldValidate: true, shouldDirty: true });
                  }
                }}
              />
              <input type="hidden" {...register("bookingWindowEndMin")} />
              {errors.bookingWindowEndMin?.message && (
                <p className="text-xs font-medium text-destructive">
                  {errors.bookingWindowEndMin.message}
                </p>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground sm:col-span-3">
              Klanten zien tijdstippen tussen {minutesToHHMM(bookingWindowStartMin)} en{" "}
              {minutesToHHMM(bookingWindowEndMin)} met stapgrootte{" "}
              {formatIntervalLabel(bookingIntervalMinutes)}.
            </p>
          </div>
        )}
      </div>
      )}

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Voorraad & status</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="quantity">Aantal beschikbaar</Label>
              {isAddon && (
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={stockNa}
                    onChange={(e) =>
                      setValue("quantity", e.target.checked ? 0 : 1, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    className="size-3.5 accent-[var(--primary)]"
                  />
                  N.v.t.
                </label>
              )}
            </div>
            {stockNa ? (
              // RHF onthoudt de waarde (0) ook zonder gemount input.
              <div className="flex h-10 items-center rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground">
                Niet van toepassing
              </div>
            ) : (
              <Input
                id="quantity"
                type="number"
                min={isAddon ? 0 : 1}
                step={1}
                {...register("quantity")}
              />
            )}
            <p className="text-xs text-muted-foreground">
              {isAddon
                ? "Optioneel — vink N.v.t. aan als deze extra geen voorraadlimiet heeft."
                : "Hoeveel exemplaren van dit item heb je?"}
            </p>
            {errors.quantity?.message && (
              <p className="text-xs font-medium text-destructive">
                {errors.quantity.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <button
              type="button"
              onClick={() => setValue("isActive", !isActive)}
              aria-pressed={Boolean(isActive)}
              title={isActive ? "Zichtbaar voor klanten" : "Verborgen voor klanten"}
              className={`flex h-10 w-full items-center justify-between gap-2 rounded-md border px-3 transition-colors ${
                isActive
                  ? "border-primary/40 bg-primary/5 text-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              <span className="inline-flex items-center gap-2 text-sm font-medium">
                {isActive ? (
                  <Eye className="size-4 text-primary" />
                ) : (
                  <EyeOff className="size-4" />
                )}
                {isActive ? "Actief" : "Verborgen"}
              </span>
              <span
                className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                  isActive ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block size-4 transform rounded-full bg-background shadow transition-transform ${
                    isActive ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </span>
            </button>
            <input type="hidden" {...register("isActive")} value={isActive ? "true" : "false"} />
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        {existing ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setDeleteOpen(true)}
            className="w-full text-destructive hover:bg-destructive/10 sm:w-auto"
          >
            <Trash2 className="size-4" />
            Verwijderen
          </Button>
        ) : (
          <span className="hidden sm:block" />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/items")}
            className="w-full sm:w-auto"
          >
            Annuleren
          </Button>
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending && <Loader2 className="size-4 animate-spin" />}
            {existing ? "Opslaan" : "Item toevoegen"}
          </Button>
        </div>
      </div>

      {existing && (
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Item verwijderen?</DialogTitle>
              <DialogDescription>
                Als er nog boekingen aan dit item gekoppeld zijn wordt 'ie op inactief gezet — anders
                wordt 'ie definitief verwijderd.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Annuleren
              </Button>
              <Button variant="destructive" onClick={onDelete} disabled={pending}>
                Verwijderen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </form>
  );
}

function PriceField({
  label,
  name,
  register,
  watch,
  setValue,
  toggleable = false,
}: {
  label: string;
  name:
    | "pricePerUnit"
    | "deposit"
    | "cleaningFee"
    | "captainFee"
    | "fuelFee"
    | "addonPrice";
  register: ReturnType<typeof useForm<ItemFormValues>>["register"];
  watch: ReturnType<typeof useForm<ItemFormValues>>["watch"];
  setValue: ReturnType<typeof useForm<ItemFormValues>>["setValue"];
  toggleable?: boolean;
}) {
  const raw = watch(name);
  // null/undefined = uitgeschakeld. Een lege string telt als INGESCHAKELD:
  // dat is wat onToggle zet bij aanzetten, zodat het veld leeg rendert i.p.v.
  // "0". Zou een lege string als "uit" gelden, dan sprong de toggle direct
  // terug naar uit en kon je 'm nooit aanzetten.
  const enabled = raw !== null && raw !== undefined;

  // Onthoud de laatste ingevulde waarde, zodat uit→aan zetten 'm terugzet
  // i.p.v. het veld leeg te maken. Blijft binnen deze bewerksessie bewaard.
  const lastValueRef = useRef<string>("");

  const onToggle = () => {
    if (enabled) {
      // Bewaar de huidige waarde vóór we 'm wissen.
      if (raw !== null && raw !== undefined && String(raw) !== "") {
        lastValueRef.current = String(raw);
      }
      setValue(name, null, { shouldValidate: true, shouldDirty: true });
    } else {
      // Zet de onthouden waarde terug; nog nooit iets ingevuld → leeg veld.
      setValue(name, (lastValueRef.current || "") as unknown as null, {
        shouldValidate: false,
        shouldDirty: true,
      });
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={name}>{label}</Label>
        {toggleable && (
          <button
            type="button"
            onClick={onToggle}
            className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              enabled ? "bg-primary" : "bg-muted"
            }`}
            aria-pressed={enabled}
            aria-label={`${label} ${enabled ? "uit" : "aan"}zetten`}
          >
            <span
              className={`inline-block size-4 transform rounded-full bg-background shadow transition-transform ${
                enabled ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        )}
      </div>
      <div className="relative">
        <span
          className={`pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm ${
            toggleable && !enabled ? "text-muted-foreground/40" : "text-muted-foreground"
          }`}
        >
          €
        </span>
        <Input
          id={name}
          type="text"
          inputMode="decimal"
          placeholder={toggleable && !enabled ? "uitgeschakeld" : "0,00"}
          className="pl-7"
          disabled={toggleable && !enabled}
          {...register(name)}
        />
      </div>
    </div>
  );
}
