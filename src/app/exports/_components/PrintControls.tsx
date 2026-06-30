"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

/**
 * Opent automatisch het print-dialoog (→ "Opslaan als PDF") zodra de
 * print-pagina geladen is, met een knop om het handmatig opnieuw te doen.
 * De balk zelf wordt in de print verborgen (print:hidden).
 */
export function PrintControls({
  label = "Opslaan als PDF",
}: {
  label?: string;
}) {
  useEffect(() => {
    // Kleine vertraging zodat layout + logo geladen zijn vóór het dialoog opent.
    const t = setTimeout(() => {
      try {
        window.print();
      } catch {
        /* niets — de knop blijft beschikbaar */
      }
    }, 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
      <button
        type="button"
        onClick={() => window.history.back()}
        className="text-sm text-gray-500 transition-colors hover:text-gray-900"
      >
        ← Terug
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex h-9 items-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-medium text-white transition-colors hover:bg-gray-700"
      >
        <Printer className="size-4" />
        {label}
      </button>
    </div>
  );
}
