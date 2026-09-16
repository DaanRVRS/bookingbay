"use client";

import { Printer } from "lucide-react";

/**
 * Opent de printdialoog van de browser — daarmee kun je de pagina als PDF
 * opslaan. Gebruikt voor de voorwaarden (ter hand stellen, art. 6:234 BW)
 * en voor facturen.
 */
export function PrintButton({ label = "Opslaan als PDF of afdrukken" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print-hidden inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent"
    >
      <Printer className="size-3.5" aria-hidden />
      {label}
    </button>
  );
}
