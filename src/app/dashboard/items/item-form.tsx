"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Trash2 } from "lucide-react";
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

type ItemFormValues = z.input<typeof itemCreateSchema>;

interface Existing {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  imageUrl: string | null;
  pricePerHour: number | null;
  pricePerDay: number | null;
  pricePerWeek: number | null;
  deposit: number | null;
  quantity: number;
  isActive: boolean;
}

interface Props {
  categories: { id: string; name: string; parentId: string | null }[];
  existing?: Existing;
}

export function ItemForm({ categories, existing }: Props) {
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
      pricePerHour: existing?.pricePerHour ?? null,
      pricePerDay: existing?.pricePerDay ?? null,
      pricePerWeek: existing?.pricePerWeek ?? null,
      deposit: existing?.deposit ?? null,
      quantity: existing?.quantity ?? 1,
      isActive: existing?.isActive ?? true,
    },
  });

  const categoryId = watch("categoryId");
  const isActive = watch("isActive");

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
        <h2 className="text-sm font-semibold">Prijzen</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Vul alleen de prijzen in die je gebruikt. Bedragen in euro&apos;s, max. 2 decimalen.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <PriceField label="Per uur" name="pricePerHour" register={register} />
          <PriceField label="Per dag" name="pricePerDay" register={register} />
          <PriceField label="Per week" name="pricePerWeek" register={register} />
          <PriceField label="Borg" name="deposit" register={register} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Voorraad & status</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quantity">Aantal beschikbaar</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              step={1}
              {...register("quantity")}
            />
            <p className="text-xs text-muted-foreground">
              Hoeveel exemplaren van dit item heb je?
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <button
              type="button"
              onClick={() => setValue("isActive", !isActive)}
              className={`flex h-10 w-full items-center justify-between rounded-md border px-3 text-sm transition-colors ${
                isActive
                  ? "border-primary/40 bg-primary/5 text-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              <span>{isActive ? "Actief — zichtbaar voor klanten" : "Inactief — verborgen"}</span>
              <span
                className={`grid size-4 place-items-center rounded-full ${
                  isActive ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span className="size-1.5 rounded-full bg-background" />
              </span>
            </button>
            <input type="hidden" {...register("isActive")} value={isActive ? "true" : "false"} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        {existing ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setDeleteOpen(true)}
            className="text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-4" />
            Verwijderen
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard/items")}>
            Annuleren
          </Button>
          <Button type="submit" disabled={pending}>
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
}: {
  label: string;
  name: "pricePerHour" | "pricePerDay" | "pricePerWeek" | "deposit";
  register: ReturnType<typeof useForm<ItemFormValues>>["register"];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
          €
        </span>
        <Input
          id={name}
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          className="pl-7"
          {...register(name)}
        />
      </div>
    </div>
  );
}
