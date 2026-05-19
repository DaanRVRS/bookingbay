"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Error-boundary voor de embed-widget (iframe). Vangt elke throw op — ook
 * van oude gecachte bundles — en toont een nette retry binnen het iframe
 * i.p.v. Next.js' kale crash-scherm.
 */
export default function EmbedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[embed] route error:", error);
  }, [error]);

  return (
    <div className="grid min-h-[420px] place-items-center bg-background px-4">
      <div className="w-full max-w-xs rounded-xl border border-border bg-card p-6 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
          <RefreshCw className="size-5" />
        </span>
        <p className="mt-4 text-sm font-medium">Even opnieuw proberen</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Verouderde versie in de browser — herladen lost het op.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <RefreshCw className="size-4" />
          Opnieuw laden
        </button>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Probeer zonder herladen
        </button>
      </div>
    </div>
  );
}
