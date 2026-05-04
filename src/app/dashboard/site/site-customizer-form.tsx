"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/auth/FormField";
import { ImageUploader } from "@/components/dashboard/ImageUploader";
import { updateSiteAction } from "@/lib/orgs/site-actions";
import { siteCustomizerSchema, type SiteCustomizerInput } from "@/lib/orgs/site-schemas";

type FormValues = z.input<typeof siteCustomizerSchema>;

interface Props {
  orgName: string;
  initial: {
    heroTitle: string;
    heroSubtitle: string;
    aboutText: string;
    primaryColor: string;
    logoUrl: string | null;
    contactEmail: string;
    contactPhone: string;
    itemDisplayStyle: "GRID" | "LIST";
  };
}

const COLOR_PRESETS = [
  { label: "BookingBay", value: "#ef5934" },
  { label: "Ocean", value: "#0a6b8c" },
  { label: "Forest", value: "#2f7a4d" },
  { label: "Plum", value: "#7a2f6b" },
  { label: "Slate", value: "#1f2937" },
  { label: "Sand", value: "#a3743b" },
];

export function SiteCustomizerForm({ initial, orgName }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    setValue,
    watch,
  } = useForm<FormValues, unknown, SiteCustomizerInput>({
    resolver: zodResolver(siteCustomizerSchema),
    defaultValues: {
      heroTitle: initial.heroTitle,
      heroSubtitle: initial.heroSubtitle,
      aboutText: initial.aboutText,
      primaryColor: initial.primaryColor,
      logoUrl: initial.logoUrl ?? "",
      contactEmail: initial.contactEmail,
      contactPhone: initial.contactPhone,
      itemDisplayStyle: initial.itemDisplayStyle,
    },
  });

  const primaryColor = watch("primaryColor");
  const logoUrl = watch("logoUrl") ?? "";
  const itemDisplayStyle = watch("itemDisplayStyle");
  const accent = primaryColor || "#ef5934";

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const res = await updateSiteAction(values);
      if (!res.ok) {
        if (res.fieldErrors) {
          for (const [k, v] of Object.entries(res.fieldErrors)) {
            setError(k as keyof FormValues, { message: v });
          }
        }
        toast.error(res.error);
        return;
      }
      toast.success("Klantsite bijgewerkt");
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {/* Brand */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Merk</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Logo en accentkleur worden gebruikt op je klantsite én in transactionele e-mails.
        </p>

        <div className="mt-5 flex flex-col gap-5">
          <div>
            <Label className="mb-1.5 block">Logo</Label>
            <ImageUploader
              value={logoUrl || null}
              onChange={(url) => setValue("logoUrl", url ?? "", { shouldValidate: false })}
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="primaryColor">Accentkleur</Label>
              <span className="font-mono text-[11px] text-muted-foreground">
                {accent}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="color"
                value={accent}
                onChange={(e) => setValue("primaryColor", e.target.value, { shouldValidate: true })}
                className="h-10 w-14 cursor-pointer rounded-md border border-border bg-card"
                aria-label="Accentkleur kiezen"
              />
              <Input
                id="primaryColor"
                placeholder="#ef5934"
                className="font-mono"
                {...register("primaryColor")}
              />
            </div>
            {errors.primaryColor?.message && (
              <p className="mt-1 text-xs font-medium text-destructive">
                {errors.primaryColor.message}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.value}
                  onClick={() => setValue("primaryColor", preset.value, { shouldValidate: true })}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] hover:bg-accent"
                >
                  <span
                    className="size-3 rounded-full ring-1 ring-inset ring-border"
                    style={{ background: preset.value }}
                    aria-hidden
                  />
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Hero-sectie</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          De grote tekst bovenaan je site. Houd 't kort en concreet.
        </p>

        <div className="mt-5 flex flex-col gap-4">
          <FormField
            label="Hero-titel"
            placeholder={`Bijv. "${orgName} — vaar de Friese meren op"`}
            error={errors.heroTitle?.message}
            {...register("heroTitle")}
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="heroSubtitle">Hero-subtitel</Label>
            <Textarea
              id="heroSubtitle"
              rows={2}
              placeholder="Eén of twee zinnen — wat verhuur je en voor wie?"
              aria-invalid={Boolean(errors.heroSubtitle)}
              {...register("heroSubtitle")}
            />
            {errors.heroSubtitle?.message && (
              <p className="text-xs font-medium text-destructive">{errors.heroSubtitle.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* About */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Over ons</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Optionele introductie-tekst onder de hero. Lege regels worden afgebroken.
        </p>
        <div className="mt-4 flex flex-col gap-1.5">
          <Textarea
            id="aboutText"
            rows={6}
            placeholder="Wij zijn een verhuurbedrijf in… al sinds…"
            aria-invalid={Boolean(errors.aboutText)}
            {...register("aboutText")}
          />
          {errors.aboutText?.message && (
            <p className="text-xs font-medium text-destructive">{errors.aboutText.message}</p>
          )}
        </div>
      </div>

      {/* Contact */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Contactgegevens</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Hier ontvang je meldingen van leads. E-mail is verplicht voor de notificaties.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <FormField
            label="Contact-e-mail"
            type="email"
            placeholder="info@bedrijf.nl"
            error={errors.contactEmail?.message}
            {...register("contactEmail")}
          />
          <FormField
            label="Telefoon"
            placeholder="020 12 34 56"
            error={errors.contactPhone?.message}
            {...register("contactPhone")}
          />
        </div>
      </div>

      {/* Display style */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Weergave aanbod</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Hoe items op je site getoond worden.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {(
            [
              { value: "GRID", label: "Raster", body: "Cards in 2-3 kolommen — visueel" },
              { value: "LIST", label: "Lijst", body: "Compacte rij per item — sneller scannen" },
            ] as const
          ).map((opt) => {
            const selected = itemDisplayStyle === opt.value;
            return (
              <button
                type="button"
                key={opt.value}
                onClick={() => setValue("itemDisplayStyle", opt.value)}
                className={`flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors ${
                  selected
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-background hover:bg-accent"
                }`}
              >
                <span className="text-sm font-medium">{opt.label}</span>
                <span className="text-xs text-muted-foreground">{opt.body}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending && <Loader2 className="size-4 animate-spin" />}
          Opslaan
        </Button>
      </div>
    </form>
  );
}
