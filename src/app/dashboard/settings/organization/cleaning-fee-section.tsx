"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCleaningFeeAction } from "@/lib/settings/cleaning-fee-actions";

interface Initial {
  enabled: boolean;
  cents: number;
}

interface Props {
  initial: Initial;
  disabled?: boolean;
}

function centsToEuros(c: number): string {
  return (c / 100).toFixed(2).replace(".", ",");
}

function eurosToCents(s: string): number {
  // Accepteer zowel komma als punt; alles wat geen cijfer/scheider is wordt
  // gestript zodat plak-acties als "€ 15,00" ook gewoon werken.
  const clean = s
    .replace(/[€\s]/g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");
  const n = Number(clean);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function CleaningFeeSection({ initial, disabled }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [amount, setAmount] = useState(centsToEuros(initial.cents));
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cents = eurosToCents(amount);
    startTransition(async () => {
      const result = await updateCleaningFeeAction({ enabled, cents });
      if (result.ok) {
        toast.success("Opgeslagen");
        setAmount(centsToEuros(cents));
        router.refresh();
      } else {
        if (result.fieldErrors?.cents) setError(result.fieldErrors.cents);
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
          <span className="text-sm font-medium">Schoonmaakkosten toevoegen</span>
          <span className="text-xs text-muted-foreground">
            Vast bedrag dat per boeking wordt opgeteld bij het totaal. Klant
            ziet 'm als losse regel in de boek-widget en op de bevestiging.
          </span>
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cleaning-amount" className="flex items-center gap-1.5 text-xs">
            <Sparkles className="size-3.5" />
            Bedrag
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">€</span>
            <Input
              id="cleaning-amount"
              type="text"
              inputMode="decimal"
              placeholder="15,00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (error) setError(null);
              }}
              disabled={disabled || !enabled}
              aria-invalid={error ? "true" : undefined}
              className="w-28"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="rounded-lg border border-dashed border-border bg-background/50 p-3 text-xs text-muted-foreground">
          Een vaste fee, ongeacht hoeveel uur of dagen er geboekt wordt.
          Werkt het beste voor verhuur waar je tussen klanten door moet
          schoonmaken (boten, fietsen, materiaal). Voor een variabele
          aanpak per item kun je 't beter in de item-prijs verwerken.
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
