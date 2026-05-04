"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, Globe } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/auth/FormField";
import { Label } from "@/components/ui/label";
import {
  onboardingSchema,
  type OnboardingInput,
  INDUSTRIES,
  suggestSlug,
} from "@/lib/orgs/schemas";
import { createOrganizationAction, checkSlugAvailability } from "@/lib/orgs/actions";

interface Props {
  defaultName?: string;
}

export function OnboardingForm({ defaultName }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    setValue,
    watch,
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: defaultName ?? "",
      slug: defaultName ? suggestSlug(defaultName) : "",
      industry: "boats",
      firstCategory: "",
    },
  });

  const watchedName = watch("name");
  const watchedSlug = watch("slug");
  const watchedIndustry = watch("industry");

  // Auto-suggest slug from name (only if user hasn't manually edited slug)
  const [slugTouched, setSlugTouched] = useState(false);
  useEffect(() => {
    if (!slugTouched && watchedName) {
      const suggested = suggestSlug(watchedName);
      setValue("slug", suggested, { shouldValidate: false });
    }
  }, [watchedName, slugTouched, setValue]);

  // Live check slug availability (debounced)
  useEffect(() => {
    if (!watchedSlug || watchedSlug.length < 3) {
      setSlugStatus("idle");
      return;
    }
    setSlugStatus("checking");
    const handle = setTimeout(async () => {
      try {
        const result = await checkSlugAvailability(watchedSlug);
        setSlugStatus(result.available ? "available" : "taken");
      } catch {
        setSlugStatus("idle");
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [watchedSlug]);

  // Suggest first category based on industry
  useEffect(() => {
    const defaults: Record<string, string> = {
      boats: "Zeilboten",
      bikes: "Stadsfietsen",
      cars: "Bestelbusjes",
      tools: "Boormachines",
      events: "Statafels",
      outdoor: "Tenten",
      other: "Algemeen",
    };
    const current = watch("firstCategory");
    if (!current) {
      setValue("firstCategory", defaults[watchedIndustry] ?? "Algemeen", { shouldValidate: false });
    }
  }, [watchedIndustry, setValue, watch]);

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const res = await createOrganizationAction(values);
      if (!res.ok) {
        if (res.fieldErrors) {
          for (const [field, message] of Object.entries(res.fieldErrors)) {
            setError(field as keyof OnboardingInput, { message });
          }
        }
        toast.error(res.error);
        return;
      }
      toast.success("Werkruimte aangemaakt");
      router.replace("/dashboard");
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FormField
        label="Naam van je organisatie"
        autoFocus
        autoComplete="organization"
        placeholder="Bijv. Aurora Bootverhuur"
        error={errors.name?.message}
        {...register("name")}
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="slug">Klantsite-URL</Label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs text-muted-foreground">
            https://
          </span>
          <input
            id="slug"
            placeholder="aurora"
            className="border-input flex h-10 w-full rounded-md border bg-background pl-[4.5rem] pr-32 py-2 text-sm shadow-xs outline-none ring-3 ring-transparent focus:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-destructive/15"
            aria-invalid={Boolean(errors.slug)}
            {...register("slug", {
              onChange: () => setSlugTouched(true),
            })}
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
            .bookingbay.nl
          </span>
        </div>
        <SlugHint
          slugStatus={slugStatus}
          slug={watchedSlug}
          error={errors.slug?.message}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Wat verhuur je voornamelijk?</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {INDUSTRIES.map((opt) => {
            const selected = watchedIndustry === opt.value;
            return (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                  selected
                    ? "border-primary/50 bg-primary/5 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-accent"
                }`}
              >
                <span>{opt.label}</span>
                <input
                  type="radio"
                  value={opt.value}
                  className="sr-only"
                  {...register("industry")}
                />
                {selected && (
                  <span className="grid size-4 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-2.5" />
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      <FormField
        label="Eerste categorie"
        hint="Je kan straks meer categorieën nesten en hernoemen"
        placeholder="Bijv. Zeilboten"
        error={errors.firstCategory?.message}
        {...register("firstCategory")}
      />

      <Button
        type="submit"
        disabled={pending || slugStatus === "taken"}
        className="h-11 w-full"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Werkruimte aanmaken
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        14 dagen gratis proberen — geen creditcard nodig.
      </p>
    </form>
  );
}

function SlugHint({
  slugStatus,
  slug,
  error,
}: {
  slugStatus: "idle" | "checking" | "available" | "taken";
  slug: string;
  error?: string;
}) {
  if (error) {
    return <p className="text-xs font-medium text-destructive">{error}</p>;
  }
  if (slugStatus === "checking" && slug.length >= 3) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Check beschikbaarheid…
      </p>
    );
  }
  if (slugStatus === "available") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-[oklch(0.5_0.14_150)]">
        <Globe className="size-3" />
        {slug}.bookingbay.nl is vrij
      </p>
    );
  }
  if (slugStatus === "taken") {
    return <p className="text-xs font-medium text-destructive">{slug}.bookingbay.nl is al in gebruik</p>;
  }
  return <p className="text-xs text-muted-foreground">Wordt straks je publieke klantsite-URL.</p>;
}
