"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Error-boundary voor de hele /book-route. Vangt ELKE throw in de
 * booking-flow op (ook van oude, gecachte client-bundles met dode
 * server-action-refs) en toont een nette retry i.p.v. Next.js' kale
 * "This page couldn't load"-scherm.
 *
 * `reset()` alleen is niet genoeg bij version-skew (oude bundle blijft
 * oude bundle) — daarom doen we een harde reload die, dankzij de
 * no-store cache-headers op /book, gegarandeerd verse code ophaalt.
 */
export default function BookError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[book] route error:", error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center bg-muted/30 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
          <RefreshCw className="size-6" />
        </span>
        <h1 className="mt-5 text-lg font-semibold tracking-tight">
          Even opnieuw proberen
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Er ging iets mis bij het laden. Dit komt meestal door een
          verouderde versie in je browser — één klik lost het op.
        </p>
        <button
          type="button"
          onClick={() => {
            // Harde reload met cache-bypass: forceert de nieuwste code.
            window.location.reload();
          }}
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
        >
          <RefreshCw className="size-4" />
          Opnieuw laden
        </button>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-lg border border-border bg-background px-5 text-xs font-medium hover:bg-accent"
        >
          Probeer zonder herladen
        </button>
      </div>
    </main>
  );
}
