"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/auth/FormField";
import { updateOrgAction } from "@/lib/settings/actions";
import { updateOrgSchema, type UpdateOrgInput } from "@/lib/settings/schemas";

interface Props {
  initial: { name: string; slug: string; industry: string };
  disabled?: boolean;
}

export function OrgSettingsForm({ initial, disabled }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setError,
    reset,
    watch,
  } = useForm<UpdateOrgInput>({
    resolver: zodResolver(updateOrgSchema),
    defaultValues: initial,
  });

  const watchedSlug = watch("slug");
  const slugChanged = watchedSlug !== initial.slug;

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const res = await updateOrgAction(values);
      if (!res.ok) {
        if (res.fieldErrors) {
          for (const [k, v] of Object.entries(res.fieldErrors)) {
            setError(k as keyof UpdateOrgInput, { message: v });
          }
        }
        toast.error(res.error);
        return;
      }
      toast.success("Organisatie bijgewerkt");
      reset(values);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormField
        label="Naam organisatie"
        error={errors.name?.message}
        disabled={disabled}
        {...register("name")}
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="slug">Klantsite-slug</Label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs text-muted-foreground">
            https://
          </span>
          <Input
            id="slug"
            disabled={disabled}
            placeholder="aurora"
            className="pl-[4.5rem] pr-32"
            {...register("slug")}
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
            .bookingbay.nl
          </span>
        </div>
        {errors.slug?.message && (
          <p className="text-xs font-medium text-destructive">{errors.slug.message}</p>
        )}
        {slugChanged && !errors.slug && (
          <p className="text-xs font-medium text-[oklch(0.45_0.13_70)]">
            ⚠️ Bestaande klantsite-links breken — communiceer dit met je klanten.
          </p>
        )}
      </div>

      <FormField
        label="Branche (optioneel)"
        placeholder="bv. boats, bikes, tools, …"
        error={errors.industry?.message}
        disabled={disabled}
        {...register("industry")}
      />

      <div className="flex justify-end">
        <Button type="submit" disabled={disabled || pending || !isDirty}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Opslaan
        </Button>
      </div>
    </form>
  );
}
