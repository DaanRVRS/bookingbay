"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  pauseIntegrationAction,
  registerInterestAction,
  removeIntegrationAction,
  requestActivationAction,
} from "@/lib/integrations/actions";
import type { OrgIntegrationStatus } from "@prisma/client";

interface Props {
  slug: string;
  catalogStatus: "available" | "beta" | "coming-soon";
  orgStatus: OrgIntegrationStatus | null;
  /** Provider-URL voor "registreer eerst" hint bij sommige koppelingen. */
  vendorUrl?: string;
}

export function ActivationActions({
  slug,
  catalogStatus,
  orgStatus,
  vendorUrl,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function run(
    fn: () => Promise<{ ok: boolean; error?: string; data?: unknown }>,
  ) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? "Er ging iets mis. Probeer opnieuw.");
        return;
      }
      // OAuth-flow: server geeft een redirect-URL terug, niet een DB-write.
      const data = res.data as { redirectTo?: string } | undefined;
      if (data?.redirectTo) {
        window.location.href = data.redirectTo;
        return;
      }
      setNote("");
      router.refresh();
    });
  }

  // ─── Al actief / failed → pauze/remove ─────────────────────────────
  if (orgStatus === "ACTIVE") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          Deze koppeling is actief en wordt elke maand op je factuur meegenomen.
        </p>
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => pauseIntegrationAction({ slug }))}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Koppeling pauzeren
        </button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  if (orgStatus === "PAUSED" || orgStatus === "FAILED") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          {orgStatus === "PAUSED"
            ? "Gepauzeerd — geen sync, geen billing. Activeer opnieuw om verder te gaan."
            : "Verbinding verbroken. Stuur een nieuw activatie-verzoek om opnieuw te koppelen."}
        </p>
        <button
          type="button"
          disabled={isPending || catalogStatus === "coming-soon"}
          onClick={() => run(() => requestActivationAction({ slug }))}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Opnieuw activeren
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => removeIntegrationAction({ slug }))}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
        >
          Verwijderen
        </button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  // ─── Pending verzoek of interesse → kan annuleren ──────────────────
  if (orgStatus === "REQUESTED" || orgStatus === "INTERESTED") {
    return (
      <div className="flex flex-col gap-2">
        <p className="rounded-lg border border-primary/30 bg-primary/8 p-3 text-xs text-foreground">
          {orgStatus === "REQUESTED"
            ? "We hebben je verzoek ontvangen. Ons team neemt binnen één werkdag contact op om de koppeling af te ronden."
            : "Bedankt voor je interesse! We laten weten zodra deze koppeling beschikbaar is."}
        </p>
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => removeIntegrationAction({ slug }))}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
        >
          Verzoek annuleren
        </button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  // ─── Niets actief: 'Activeer' (available) of 'Interesse' (coming-soon) ─
  const isAvailable = catalogStatus === "available" || catalogStatus === "beta";
  return (
    <div className="flex flex-col gap-3">
      <label className="block text-xs font-medium text-muted-foreground">
        Toelichting (optioneel)
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder={
            isAvailable
              ? "Bv. 'Activeer alleen voor team-account, niet de hoofdmailbox'"
              : "Vertel wat je hoopt te kunnen — dit helpt ons prioriteren."
          }
          className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
        />
      </label>

      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          run(() =>
            isAvailable
              ? requestActivationAction({ slug, note: note || undefined })
              : registerInterestAction({ slug, note: note || undefined }),
          )
        }
        className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
        {isAvailable ? "Activeer koppeling" : "Houd mij op de hoogte"}
      </button>

      {isAvailable && vendorUrl && (
        <p className="text-[11px] text-muted-foreground">
          Heb je nog geen account bij de provider?{" "}
          <a
            href={vendorUrl}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Maak er hier één aan
          </a>
          .
        </p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
