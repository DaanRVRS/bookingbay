"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { categoryCreateSchema, type CategoryCreateInput } from "@/lib/categories/schemas";
import { createCategoryAction, updateCategoryAction } from "@/lib/categories/actions";
import { ImageUploader } from "@/components/dashboard/ImageUploader";

interface Existing {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  parentId: string | null;
}

interface Props {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  existing?: Existing;
  categories: { id: string; name: string; parentId: string | null }[];
  defaultParentId?: string | null;
}

export function CategoryDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
  existing,
  categories,
  defaultParentId,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger as React.ReactElement} />}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Categorie bewerken" : "Nieuwe categorie"}</DialogTitle>
          <DialogDescription>
            {existing
              ? "Wijzig naam, beschrijving of bovenliggende categorie."
              : "Voeg een nieuwe categorie toe aan je catalogus."}
          </DialogDescription>
        </DialogHeader>
        <CategoryForm
          existing={existing}
          categories={categories}
          defaultParentId={defaultParentId}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function CategoryForm({
  existing,
  categories,
  defaultParentId,
  onDone,
}: {
  existing?: Existing;
  categories: { id: string; name: string; parentId: string | null }[];
  defaultParentId?: string | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    setValue,
    watch,
  } = useForm<CategoryCreateInput>({
    resolver: zodResolver(categoryCreateSchema),
    defaultValues: {
      name: existing?.name ?? "",
      description: existing?.description ?? "",
      imageUrl: existing?.imageUrl ?? "",
      parentId: existing?.parentId ?? defaultParentId ?? null,
    },
  });

  const parentId = watch("parentId");
  const imageUrl = watch("imageUrl") ?? "";

  // Filter out self + descendants when editing
  const validParents = categories.filter((c) => {
    if (!existing) return true;
    if (c.id === existing.id) return false;
    // Walk up: ensure c is not a descendant of existing (would create cycle)
    let current = c.parentId;
    while (current) {
      if (current === existing.id) return false;
      current = categories.find((x) => x.id === current)?.parentId ?? null;
    }
    return true;
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const res = existing
        ? await updateCategoryAction({ ...values, id: existing.id })
        : await createCategoryAction(values);
      if (!res.ok) {
        if (res.fieldErrors) {
          for (const [k, v] of Object.entries(res.fieldErrors)) {
            setError(k as keyof CategoryCreateInput, { message: v });
          }
        }
        toast.error(res.error);
        return;
      }
      toast.success(existing ? "Bijgewerkt" : "Categorie toegevoegd");
      router.refresh();
      onDone();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormField
        label="Naam"
        autoFocus
        placeholder="Bijv. Zeilboten"
        error={errors.name?.message}
        {...register("name")}
      />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Beschrijving (optioneel)</Label>
        <Textarea
          id="description"
          placeholder="Korte omschrijving voor je team"
          rows={3}
          {...register("description")}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Afbeelding (optioneel)</Label>
        <ImageUploader
          value={imageUrl || null}
          onChange={(url) => setValue("imageUrl", url ?? "", { shouldValidate: false })}
        />
      </div>
      {validParents.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label>Bovenliggende categorie</Label>
          <Select
            items={[
              { value: "__none__", label: "Geen — top-level categorie" },
              ...validParents.map((c) => ({ value: c.id, label: c.name })),
            ]}
            value={parentId ?? "__none__"}
            onValueChange={(v) =>
              setValue("parentId", !v || v === "__none__" ? null : v, { shouldValidate: false })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Geen — top-level categorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Geen — top-level categorie</SelectItem>
              {validParents.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Annuleren
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {existing ? "Opslaan" : "Toevoegen"}
        </Button>
      </DialogFooter>
    </form>
  );
}
