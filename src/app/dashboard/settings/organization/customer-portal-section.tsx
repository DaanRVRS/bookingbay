"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCustomerPortalConfigAction } from "@/lib/settings/customer-portal-actions";

interface Initial {
  enabled: boolean;
  cancelHoursMin: number;
  portalUrl: string;
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
          <span className="text-sm font-medium">Klant-portaal inschakelen</span>
          <span className="text-xs text-muted-foreground">
            Klanten loggen in met een eenmalige link in hun e-mail, zien hun
            boekingen, en kunnen zelf annuleren binnen het ingestelde
            tijdsvenster.
          </span>
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="portal-hours" className="flex items-center gap-1.5 text-xs">
            <UserCircle className="size-3.5" />
            Annulering tot
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
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Portaal-link
          </span>
          <a
            href={initial.portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 break-all text-xs text-primary hover:underline"
          >
            {initial.portalUrl}
            <ExternalLink className="size-3 shrink-0" />
          </a>
          <p className="text-xs text-muted-foreground">
            Deel dit met je klanten of voeg 'm toe aan e-mails. Werkt alleen
            wanneer het portaal aan staat.
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
