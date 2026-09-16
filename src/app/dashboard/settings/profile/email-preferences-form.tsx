"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateEmailPreferencesAction } from "@/lib/settings/actions";

export function EmailPreferencesForm({
  initialMarketingOptIn,
  broadcastOptedOut,
}: {
  initialMarketingOptIn: boolean;
  broadcastOptedOut: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [marketingOptIn, setMarketingOptIn] = useState(initialMarketingOptIn);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateEmailPreferencesAction({ marketingOptIn });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("E-mailvoorkeuren opgeslagen");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-0.5 size-4 rounded border-border accent-primary"
          checked={marketingOptIn}
          onChange={(e) => setMarketingOptIn(e.target.checked)}
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">
            Ik wil productnieuws en aanbiedingen van BookingBay per e-mail ontvangen
          </span>
          <span className="text-xs text-muted-foreground">
            Optioneel. Berichten over je account en abonnement (verlenging,
            incasso, factuur, ticketreacties) krijg je altijd; algemene
            servicemededelingen kun je via de afmeldlink in de mail
            uitzetten
            {broadcastOptedOut && " (dat heb je gedaan; opslaan zet ze weer aan)"}
            .
          </span>
        </span>
      </label>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Voorkeuren opslaan
        </Button>
      </div>
    </form>
  );
}
