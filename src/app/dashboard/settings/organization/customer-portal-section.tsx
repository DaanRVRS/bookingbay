"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserCircle, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCustomerPortalConfigAction } from "@/lib/settings/customer-portal-actions";

interface Initial {
  enabled: boolean;
  cancelHoursMin: number;
}

interface Props {
  initial: Initial;
  disabled?: boolean;
}

export function CustomerPortalSection({ initial, disabled }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [cancelHoursMin, setCancelHoursMin] = useState(String(initial.cancelHoursMin));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateCustomerPortalConfigAction({
        enabled,
        cancelHoursMin: Number(cancelHoursMin),
      });
      if (result.ok) {
        toast.success("Opgeslagen");
        router.refresh();
      } else {
        toast.error(result.error ?? "Opslaan mislukt");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5 size-4 rounded border-border accent-primary"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          disabled={disabled}
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">
            Stuur klanten een directe link naar hun boeking
          </span>
          <span className="text-xs text-muted-foreground">
            Zodra een klant boekt via je widget krijgt 'ie automatisch een
            bevestigingsmail met een persoonlijke link. Geen login of
            wachtwoord — de link werkt direct en laat de boeking-details +
            een annuleer-knop zien.
          </span>
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="portal-hours" className="flex items-center gap-1.5 text-xs">
            <UserCircle className="size-3.5" />
            Klant mag annuleren tot
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="portal-hours"
              type="number"
              min={0}
              max={168}
              value={cancelHoursMin}
              onChange={(e) => setCancelHoursMin(e.target.value)}
              disabled={disabled || !enabled}
              className="w-24"
            />
            <span className="text-xs text-muted-foreground">uur vóór start</span>
          </div>
          <p className="text-xs text-muted-foreground">
            0 = tot startmoment, 24 = dag van tevoren.
          </p>
        </div>

        <div className="flex flex-col gap-1.5 rounded-lg border border-dashed border-border bg-background/50 p-3">
          <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Mail className="size-3.5" />
            Wat krijgt de klant te zien?
          </span>
          <p className="mt-1 text-xs text-muted-foreground">
            Direct na het boeken een mail met datum, tijd, prijs, je
            contactgegevens en een knop "Bekijk mijn boeking". Diezelfde link
            zit ook in de herinnering 24u vóór de starttijd, zodat 'ie 'm
            niet kwijtraakt.
          </p>
        </div>
      </div>

      <div>
        <Button type="submit" disabled={disabled || pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Opslaan
        </Button>
      </div>
    </form>
  );
}
