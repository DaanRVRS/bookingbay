"use client";

import { useEffect, useState } from "react";

type Status = "loading" | "ok" | "degraded" | "unknown";

/**
 * Echte statusmeting i.p.v. een vaste groene stip: haalt /api/health op
 * (database-check) en toont het resultaat. Geen claim over "alle systemen"
 * — alleen wat de healthcheck daadwerkelijk meet.
 */
export function StatusIndicator() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health", { cache: "no-store" })
      .then(async (r) => {
        const data = (await r.json().catch(() => null)) as { status?: string } | null;
        if (cancelled) return;
        if (r.ok && data?.status === "ok") setStatus("ok");
        else setStatus("degraded");
      })
      .catch(() => {
        if (!cancelled) setStatus("unknown");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const label =
    status === "ok"
      ? "Platform en database bereikbaar"
      : status === "degraded"
        ? "Storing gemeld"
        : status === "unknown"
          ? "Status onbekend"
          : "Status controleren…";
  const dot =
    status === "ok"
      ? "bg-[oklch(0.7_0.13_150)]"
      : status === "degraded"
        ? "bg-destructive"
        : "bg-muted-foreground/40";

  return (
    <span className="inline-flex items-center gap-2" role="status" aria-live="polite">
      <span className={`size-1.5 rounded-full ${dot}`} aria-hidden />
      <span>{label}</span>
    </span>
  );
}
