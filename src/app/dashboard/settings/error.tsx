"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

/**
 * Error-boundary voor de hele /dashboard/settings-tree (incl. billing).
 * Vangt een server-side throw op en toont een nette retry i.p.v. de kale
 * "A server error occurred"-pagina van Next. `reset()` re-rendert het
 * segment zonder volledige page-reload.
 */
export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[settings] render error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </span>
      <div>
        <h2 className="text-lg font-semibold">Er ging iets mis</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Deze pagina kon even niet geladen worden. Probeer het opnieuw — blijft
          het hangen, mail dan{" "}
          <a className="underline" href="mailto:hallo@bookingbay.nl">
            hallo@bookingbay.nl
          </a>
          .
        </p>
        {error.digest && (
          <p className="mt-2 text-[11px] text-muted-foreground/70">
            Referentie: {error.digest}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={reset}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        <RotateCw className="size-4" />
        Opnieuw proberen
      </button>
    </div>
  );
}
