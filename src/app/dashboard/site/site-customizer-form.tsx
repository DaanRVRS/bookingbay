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
import { FormField } from "@/components/auth/FormField";
import { ImageUploader } from "@/components/dashboard/ImageUploader";
import { updateSiteAction } from "@/lib/orgs/site-actions";
import {
  siteCustomizerSchema,
  EMPTY_SITE_THEME,
  type SiteCustomizerInput,
  type SiteTheme,
} from "@/lib/orgs/site-schemas";

type FormValues = z.input<typeof siteCustomizerSchema>;

interface Props {
  orgName: string;
  initial: {
    primaryColor: string;
    logoUrl: string | null;
    contactEmail: string;
    contactPhone: string;
    businessAddress: string;
    businessPostcode: string;
    businessCity: string;
    kvkNumber: string;
    vatNumber: string;
    itemDisplayStyle: "GRID" | "LIST";
    theme: SiteTheme;
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

export function SiteCustomizerForm({ initial, orgName: _orgName }: Props) {
  void _orgName;
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
      primaryColor: initial.primaryColor,
      logoUrl: initial.logoUrl ?? "",
      contactEmail: initial.contactEmail,
      contactPhone: initial.contactPhone,
      businessAddress: initial.businessAddress,
      businessPostcode: initial.businessPostcode,
      businessCity: initial.businessCity,
      kvkNumber: initial.kvkNumber,
      vatNumber: initial.vatNumber,
      itemDisplayStyle: initial.itemDisplayStyle,
      theme: initial.theme ?? EMPTY_SITE_THEME,
    },
  });

  const primaryColor = watch("primaryColor");
  const logoUrl = watch("logoUrl") ?? "";
  const accent = primaryColor || "#ef5934";
  const theme = (watch("theme") as SiteTheme | undefined) ?? EMPTY_SITE_THEME;
  const setThemeColor = (key: keyof SiteTheme, v: string) =>
    setValue(`theme.${key}` as const, v, { shouldValidate: false, shouldDirty: true });

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

      {/* Kleuren per onderdeel */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Kleuren per onderdeel</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Geef header, footer en pagina-achtergrond elk hun eigen kleur.
          Leeg = het standaard thema. Losse blokken op je pagina&apos;s kleur
          je in de page-builder (per blok een achtergrondkleur).
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <ThemeColorField
            label="Header-achtergrond"
            value={theme.headerBg}
            onChange={(v) => setThemeColor("headerBg", v)}
          />
          <ThemeColorField
            label="Header-tekst"
            value={theme.headerText}
            onChange={(v) => setThemeColor("headerText", v)}
          />
          <ThemeColorField
            label="Footer-achtergrond"
            value={theme.footerBg}
            onChange={(v) => setThemeColor("footerBg", v)}
          />
          <ThemeColorField
            label="Footer-tekst"
            value={theme.footerText}
            onChange={(v) => setThemeColor("footerText", v)}
          />
          <ThemeColorField
            label="Pagina-achtergrond"
            value={theme.pageBg}
            onChange={(v) => setThemeColor("pageBg", v)}
          />
        </div>
      </div>

      {/* Bedrijfsgegevens */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Bedrijfsgegevens</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          E-mail is verplicht voor lead-notificaties. Adres, KvK en BTW zijn
          optioneel — wat je invult verschijnt automatisch in de footer van
          je klantsite.
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
          <FormField
            label="Adres"
            placeholder="Havenkade 12"
            error={errors.businessAddress?.message}
            {...register("businessAddress")}
          />
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <FormField
              label="Postcode"
              placeholder="1234 AB"
              error={errors.businessPostcode?.message}
              {...register("businessPostcode")}
            />
            <FormField
              label="Plaats"
              placeholder="Amsterdam"
              error={errors.businessCity?.message}
              {...register("businessCity")}
            />
          </div>
          <FormField
            label="KvK-nummer"
            placeholder="12345678"
            error={errors.kvkNumber?.message}
            {...register("kvkNumber")}
          />
          <FormField
            label="BTW-nummer"
            placeholder="NL123456789B01"
            error={errors.vatNumber?.message}
            {...register("vatNumber")}
          />
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

/** Kleurveld met picker + hex-invoer; leeg = standaard thema. */
function ThemeColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[11px] font-medium text-muted-foreground hover:text-foreground hover:underline"
          >
            Standaard
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-border bg-card"
          aria-label={`${label} kiezen`}
        />
        <Input
          value={value}
          placeholder="Standaard"
          maxLength={7}
          className="font-mono"
          onChange={(e) => {
            const v = e.target.value.trim();
            if (v === "" || /^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
          }}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v !== "" && !/^#[0-9a-fA-F]{6}$/.test(v)) onChange("");
          }}
        />
      </div>
    </div>
  );
}
