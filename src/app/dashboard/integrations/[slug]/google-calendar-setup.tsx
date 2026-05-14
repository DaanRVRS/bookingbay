"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Check, Loader2, RefreshCw } from "lucide-react";
import {
  refreshGoogleCalendarListAction,
  setItemGoogleCalendarAction,
  setOrgGoogleCalendarAction,
} from "@/lib/integrations/google-calendar-actions";

export interface CalendarOption {
  id: string;
  summary: string;
  primary: boolean;
}

interface ItemRow {
  id: string;
  name: string;
  /** Override calendar-id van dit item, of null = volg org-default. */
  calendarId: string | null;
}

interface Props {
  defaultCalendarId: string | null;
  calendars: CalendarOption[];
  /** Wanneer de calendarList het laatst werd opgehaald (epoch ms). */
  calendarsCachedAt: number | null;
  items: ItemRow[];
}

export function GoogleCalendarSetup({
  defaultCalendarId,
  calendars,
  calendarsCachedAt,
  items,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  const fallbackCalendarId =
    defaultCalendarId ?? calendars.find((c) => c.primary)?.id ?? "primary";

  function pickOrgDefault(calendarId: string) {
    setErr(null);
    startTransition(async () => {
      const res = await setOrgGoogleCalendarAction({ calendarId });
      if (!res.ok) setErr(res.error ?? "Mislukt");
      else router.refresh();
    });
  }

  function pickItemOverride(itemId: string, calendarId: string | null) {
    setErr(null);
    setBusyItemId(itemId);
    startTransition(async () => {
      const res = await setItemGoogleCalendarAction({ itemId, calendarId });
      if (!res.ok) setErr(res.error ?? "Mislukt");
      else router.refresh();
      setBusyItemId(null);
    });
  }

  async function refreshCalendars() {
    setErr(null);
    setRefreshing(true);
    const res = await refreshGoogleCalendarListAction();
    setRefreshing(false);
    if (!res.ok) setErr(res.error ?? "Mislukt");
    else router.refresh();
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <Calendar className="size-4 text-muted-foreground" />
            Agenda-keuze
          </h2>
          <p className="mt-1 max-w-xl text-xs text-muted-foreground">
            Kies welke Google-agenda we standaard gebruiken voor nieuwe
            boekingen. Per item kun je optioneel een andere agenda
            instellen (handig als &lsquo;Boot A&rsquo; en &lsquo;Boot B&rsquo; verschillende
            eigenaars hebben).
          </p>
        </div>
        <button
          type="button"
          onClick={refreshCalendars}
          disabled={refreshing || pending}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 self-start rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-accent disabled:opacity-50"
        >
          {refreshing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          Vernieuw lijst
        </button>
      </header>

      {err && (
        <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {err}
        </p>
      )}

      {calendarsCachedAt === null && calendars.length === 0 && (
        <p className="mt-4 rounded-md border border-dashed border-border bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
          Nog geen agenda-lijst opgehaald. Klik op &ldquo;Vernieuw lijst&rdquo; om
          de agenda&apos;s uit je Google-account binnen te halen.
        </p>
      )}

      {/* Org-wide default */}
      <div className="mt-5">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Standaard-agenda
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Items zonder eigen override gebruiken deze agenda.
        </p>
        <select
          value={fallbackCalendarId}
          onChange={(e) => pickOrgDefault(e.target.value)}
          disabled={pending}
          className="mt-2 block w-full max-w-md rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50"
        >
          {calendars.length === 0 && (
            <option value="primary">Primaire agenda (default)</option>
          )}
          {calendars.map((c) => (
            <option key={c.id} value={c.id}>
              {c.summary}
              {c.primary ? " · primair" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Per-item mapping */}
      {calendars.length > 0 && items.length > 0 && (
        <div className="mt-6">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Per-item agenda
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Optioneel: overschrijf de standaard-agenda per item.
          </p>
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
            {items.map((it) => {
              const usesDefault = !it.calendarId;
              const isBusy = busyItemId === it.id;
              return (
                <li
                  key={it.id}
                  className="flex items-center gap-3 px-3 py-2.5"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {it.name}
                  </span>
                  <select
                    value={it.calendarId ?? "__default"}
                    onChange={(e) =>
                      pickItemOverride(
                        it.id,
                        e.target.value === "__default" ? null : e.target.value,
                      )
                    }
                    disabled={pending}
                    className="h-8 max-w-[16rem] shrink-0 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary disabled:opacity-50"
                  >
                    <option value="__default">Standaard ↑</option>
                    {calendars.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.summary}
                      </option>
                    ))}
                  </select>
                  <span
                    className="grid w-4 shrink-0 place-items-center"
                    aria-hidden
                  >
                    {isBusy ? (
                      <Loader2 className="size-3 animate-spin text-muted-foreground" />
                    ) : usesDefault ? (
                      <span className="size-2 rounded-full bg-muted-foreground/40" />
                    ) : (
                      <Check className="size-3 text-primary" />
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
