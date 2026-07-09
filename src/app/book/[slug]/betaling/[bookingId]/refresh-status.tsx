"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { useTransition } from "react";

/**
 * Ververst de betaal-statuspagina zelf (router.refresh → server leest de
 * actuele paymentStatus opnieuw) i.p.v. terug te springen naar stap 1
 * van de boek-widget.
 */
export function RefreshStatusButton({ accent }: { accent: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold text-white shadow-sm disabled:opacity-70"
      style={{ background: accent }}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <RefreshCw className="size-4" />
      )}
      Status verversen
    </button>
  );
}

/**
 * Polt de status automatisch zolang de betaling verwerkt wordt — de
 * Mollie-webhook zet paymentStatus meestal binnen een minuut op PAID,
 * dus de pagina klapt vanzelf om zonder dat de klant hoeft te klikken.
 * Stopt na `maxMs` om niet eindeloos te blijven pollen.
 */
export function AutoRefresh({
  intervalMs = 5000,
  maxMs = 3 * 60_000,
}: {
  intervalMs?: number;
  maxMs?: number;
}) {
  const router = useRouter();
  useEffect(() => {
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      if (Date.now() - startedAt > maxMs) {
        window.clearInterval(id);
        return;
      }
      router.refresh();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [router, intervalMs, maxMs]);
  return null;
}
