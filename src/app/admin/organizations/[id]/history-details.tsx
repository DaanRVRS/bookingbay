import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { describeAction } from "@/lib/audit/log";

interface AuditEntry {
  id: string;
  action: string;
  createdAt: Date;
  actorUserId: string | null;
  metadata: unknown;
}

interface ActorMap {
  get(id: string): { name: string | null; email: string } | undefined;
}

function describeMeta(meta: unknown): string {
  if (!meta || typeof meta !== "object") return "";
  return Object.entries(meta as Record<string, unknown>)
    .slice(0, 4)
    .map(([k, v]) => {
      let str: string;
      if (v === null || v === undefined) str = "—";
      else if (typeof v === "object") str = JSON.stringify(v);
      else str = String(v);
      if (str.length > 50) str = str.slice(0, 47) + "…";
      return `${k}: ${str}`;
    })
    .join(" · ");
}

/** Inline collapsible audit-history list for a single resource row. */
export function HistoryDetails({
  entries,
  actorMap,
  emptyLabel = "Nog geen wijzigingen gelogd.",
}: {
  entries: AuditEntry[];
  actorMap: ActorMap;
  emptyLabel?: string;
}) {
  if (entries.length === 0) {
    return <span className="text-[11px] text-muted-foreground italic">—</span>;
  }
  const last = entries[0];
  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-[11px] text-muted-foreground hover:text-foreground">
        <span className="underline-offset-2 group-hover:underline">
          {entries.length}{" "}
          {entries.length === 1 ? "wijziging" : "wijzigingen"} · laatste{" "}
          {format(last.createdAt, "d MMM yyyy", { locale: nl })}
        </span>
      </summary>
      <ul className="mt-1.5 space-y-1 border-l-2 border-border pl-3 text-[11px]">
        {entries.map((e) => {
          const actor = e.actorUserId ? actorMap.get(e.actorUserId) : null;
          const meta = describeMeta(e.metadata);
          return (
            <li key={e.id} className="text-muted-foreground">
              <span className="text-foreground">{describeAction(e.action)}</span>
              {" — "}
              {format(e.createdAt, "d MMM yyyy HH:mm", { locale: nl })}
              {actor && (
                <>
                  {" door "}
                  <span className="text-foreground">{actor.name ?? actor.email}</span>
                </>
              )}
              {meta && <div className="font-mono text-[10px]">{meta}</div>}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
