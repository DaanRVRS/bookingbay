"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateBookingLegalAction } from "@/lib/settings/booking-legal-actions";

interface Initial {
  privacyUrl: string;
  termsUrl: string;
  phoneRequired: boolean;
  ageCheckEnabled: boolean;
}

interface Props {
  initial: Initial;
  orgName: string;
  disabled?: boolean;
}

export function BookingLegalSection({ initial, orgName, disabled }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [privacyUrl, setPrivacyUrl] = useState(initial.privacyUrl);
  const [termsUrl, setTermsUrl] = useState(initial.termsUrl);
  const [phoneRequired, setPhoneRequired] = useState(initial.phoneRequired);
  const [ageCheckEnabled, setAgeCheckEnabled] = useState(initial.ageCheckEnabled);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    startTransition(async () => {
      const res = await updateBookingLegalAction({
        privacyUrl: privacyUrl.trim(),
        termsUrl: termsUrl.trim(),
        phoneRequired,
        ageCheckEnabled,
      });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error ?? "Opslaan mislukt");
        return;
      }
      toast.success("Opgeslagen");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="legal-terms" className="text-xs">
            Link naar je voorwaarden (optioneel)
          </Label>
          <Input
            id="legal-terms"
            type="url"
            placeholder="https://jouwbedrijf.nl/voorwaarden"
            value={termsUrl}
            onChange={(e) => setTermsUrl(e.target.value)}
            disabled={disabled}
            aria-invalid={errors.termsUrl ? "true" : undefined}
          />
          <p className="text-xs text-muted-foreground">
            {errors.termsUrl ??
              "Ingevuld = klanten moeten in de widget een vinkje zetten dat ze je voorwaarden (annulering, borg, schade) accepteren."}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="legal-privacy" className="text-xs">
            Link naar je privacyverklaring (optioneel)
          </Label>
          <Input
            id="legal-privacy"
            type="url"
            placeholder="https://jouwbedrijf.nl/privacy"
            value={privacyUrl}
            onChange={(e) => setPrivacyUrl(e.target.value)}
            disabled={disabled}
            aria-invalid={errors.privacyUrl ? "true" : undefined}
          />
          <p className="text-xs text-muted-foreground">
            {errors.privacyUrl ??
              `Komt in de footer van je klantsite en boven de boekknop. Leeg = standaardtekst dat ${orgName} verantwoordelijk is en BookingBay verwerker.`}
          </p>
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-0.5 size-4 rounded border-border accent-primary"
          checked={phoneRequired}
          onChange={(e) => setPhoneRequired(e.target.checked)}
          disabled={disabled}
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">Telefoonnummer verplicht bij boeken</span>
          <span className="text-xs text-muted-foreground">
            Aan = de widget legt uit dat het nummer nodig is voor de
            ophaalafspraak. Uit = optioneel veld (dataminimalisatie).
          </span>
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-0.5 size-4 rounded border-border accent-primary"
          checked={ageCheckEnabled}
          onChange={(e) => setAgeCheckEnabled(e.target.checked)}
          disabled={disabled}
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">
            Vinkje &ldquo;Ik ben 18 jaar of ouder&rdquo; tonen
          </span>
          <span className="text-xs text-muted-foreground">
            Handig als je alleen aan volwassenen verhuurt (bijv. boten). Niet
            vooraf aangevinkt; zonder vinkje kan er niet geboekt worden.
          </span>
        </span>
      </label>

      <div>
        <Button type="submit" disabled={disabled || pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Opslaan
        </Button>
      </div>
    </form>
  );
}
