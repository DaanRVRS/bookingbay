"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateReviewRequestConfigAction } from "@/lib/settings/review-request-actions";

interface Initial {
  enabled: boolean;
  url: string;
  delayDays: number;
}

interface Props {
  initial: Initial;
  disabled?: boolean;
}

export function ReviewRequestSection({ initial, disabled }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [url, setUrl] = useState(initial.url);
  const [delayDays, setDelayDays] = useState(String(initial.delayDays));
  const [urlError, setUrlError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError(null);
    startTransition(async () => {
      const result = await updateReviewRequestConfigAction({
        enabled,
        url: url.trim(),
        delayDays: Number(delayDays),
      });
      if (result.ok) {
        toast.success("Opgeslagen");
        router.refresh();
      } else {
        if (result.fieldErrors?.url) setUrlError(result.fieldErrors.url);
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
            Stuur automatisch een review-uitvraag
          </span>
          <span className="text-xs text-muted-foreground">
            Klanten krijgen X dagen na afgeronde boeking een e-mail met je
            review-link.
          </span>
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="review-url" className="flex items-center gap-1.5 text-xs">
            <Star className="size-3.5" />
            Review-link
          </Label>
          <Input
            id="review-url"
            type="url"
            placeholder="https://g.page/r/..."
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (urlError) setUrlError(null);
            }}
            disabled={disabled || !enabled}
            aria-invalid={urlError ? "true" : undefined}
          />
          {urlError ? (
            <p className="text-xs text-destructive">{urlError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Je Google review-URL, Trustpilot, of een eigen pagina. Komt
              als knop in de mail.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="review-delay" className="text-xs">
            Dagen wachten
          </Label>
          <Input
            id="review-delay"
            type="number"
            min={0}
            max={30}
            value={delayDays}
            onChange={(e) => setDelayDays(e.target.value)}
            disabled={disabled || !enabled}
          />
          <p className="text-xs text-muted-foreground">na voltooid</p>
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
