"use client";

import { useState } from "react";
import {
  type BusinessHours,
  DAY_LABELS_NL,
  defaultBusinessHours,
} from "@/lib/business-hours/schemas";

interface Props {
  value: BusinessHours | null;
  onChange: (hours: BusinessHours | null) => void;
  /** Klein of normaal — kleinere variant voor de item-form. */
  compact?: boolean;
  /**
   * Tekst die wordt getoond in de aan/uit knop. Default = "Openingstijden actief".
   * Wordt overschreven voor item-overrides.
   */
  toggleLabel?: string;
  /**
   * Verberg de ingebouwde aan/uit-toggle — de parent stuurt dan zelf of de
   * editor getoond wordt (bijv. via een aparte keuze). Rijen worden getoond
   * zolang `value` niet null is.
   */
  hideToggle?: boolean;
}

export function BusinessHoursEditor({
  value,
  onChange,
  compact = false,
  toggleLabel = "Openingstijden actief",
  hideToggle = false,
}: Props) {
  const [draft, setDraft] = useState<BusinessHours>(
    value ?? defaultBusinessHours(),
  );
  const enabled = value !== null;

  const update = (idx: number, patch: Partial<BusinessHours[number]>) => {
    const next = draft.map((d, i) =>
      i === idx ? { ...d, ...patch } : d,
    ) as BusinessHours;
    setDraft(next);
    if (enabled) onChange(next);
  };

  const onToggle = () => {
    if (enabled) {
      onChange(null);
    } else {
      onChange(draft);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {!hideToggle && (
        <div className="flex items-center justify-between">
          <span className={compact ? "text-xs font-medium" : "text-sm font-medium"}>
            {toggleLabel}
          </span>
          <button
            type="button"
            onClick={onToggle}
            className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              enabled ? "bg-primary" : "bg-muted"
            }`}
            aria-pressed={enabled}
            aria-label={enabled ? "Uitzetten" : "Aanzetten"}
          >
            <span
              className={`inline-block size-4 transform rounded-full bg-background shadow transition-transform ${
                enabled ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      )}

      {enabled && (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {draft.map((d, i) => (
            <li
              key={i}
              className="grid grid-cols-[88px_auto_1fr] items-center gap-3 px-3 py-2"
            >
              <span className="text-xs font-medium">{DAY_LABELS_NL[i]}</span>
              <button
                type="button"
                onClick={() => update(i, { closed: !d.closed })}
                className={`h-7 rounded-md border px-2 text-[11px] font-medium transition-colors ${
                  d.closed
                    ? "border-border bg-muted text-muted-foreground"
                    : "border-primary/40 bg-primary/5 text-primary"
                }`}
              >
                {d.closed ? "Gesloten" : "Open"}
              </button>
              <div
                className={`flex items-center gap-2 ${d.closed ? "opacity-40" : ""}`}
              >
                <input
                  type="time"
                  value={d.open || "09:00"}
                  disabled={d.closed}
                  onChange={(e) => update(i, { open: e.target.value })}
                  className="h-8 rounded-md border border-border bg-background px-2 text-xs tabular-nums disabled:cursor-not-allowed"
                />
                <span className="text-xs text-muted-foreground">tot</span>
                <input
                  type="time"
                  value={d.close || "17:00"}
                  disabled={d.closed}
                  onChange={(e) => update(i, { close: e.target.value })}
                  className="h-8 rounded-md border border-border bg-background px-2 text-xs tabular-nums disabled:cursor-not-allowed"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
