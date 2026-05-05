import Link from "next/link";
import { Search, ScrollText } from "lucide-react";
import { db } from "@/lib/db";
import { describeAction } from "@/lib/audit/log";

export const metadata = { title: "Audit log" };

const PAGE_SIZE = 75;

function formatDate(d: Date) {
  return d.toLocaleString("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function describeMetadata(meta: unknown): string {
  if (!meta || typeof meta !== "object") return "";
  const entries = Object.entries(meta as Record<string, unknown>)
    .slice(0, 5)
    .map(([k, v]) => {
      let str: string;
      if (v === null || v === undefined) str = "—";
      else if (typeof v === "object") str = JSON.stringify(v);
      else str = String(v);
      if (str.length > 50) str = str.slice(0, 47) + "…";
      return `${k}: ${str}`;
    });
  return entries.join(" · ");
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; action?: string; org?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const actionFilter = (sp.action ?? "").trim();
  const orgFilter = (sp.org ?? "").trim();
  const pageNum = Math.max(1, Number(sp.page ?? "1") || 1);
  const skip = (pageNum - 1) * PAGE_SIZE;

  const where = {
    ...(actionFilter && { action: { startsWith: actionFilter } }),
    ...(orgFilter && { organizationId: orgFilter }),
  };

  const [logs, total, distinctActionsRaw] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip,
    }),
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
      take: 80,
    }),
  ]);

  const actorIds = Array.from(
    new Set(logs.map((l) => l.actorUserId).filter((x): x is string => Boolean(x))),
  );
  const orgIds = Array.from(
    new Set(logs.map((l) => l.organizationId).filter((x): x is string => Boolean(x))),
  );

  const [actors, orgs] = await Promise.all([
    actorIds.length
      ? db.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([]),
    orgIds.length
      ? db.organization.findMany({
          where: { id: { in: orgIds } },
          select: { id: true, name: true, slug: true },
        })
      : Promise.resolve([]),
  ]);

  const actorMap = new Map(actors.map((a) => [a.id, a]));
  const orgMap = new Map(orgs.map((o) => [o.id, o]));

  // Filter by free-text query (actor email/name OR resourceId)
  const filtered = q
    ? logs.filter((l) => {
        const actor = l.actorUserId ? actorMap.get(l.actorUserId) : null;
        const hay = [
          actor?.email,
          actor?.name,
          l.resourceId,
          l.resource,
          l.action,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q.toLowerCase());
      })
    : logs;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const distinctActions = distinctActionsRaw.map((d) => d.action);
  const actionPrefixes = Array.from(
    new Set(distinctActions.map((a) => a.split(".")[0])),
  ).sort();

  function buildHref(overrides: Record<string, string | undefined>): string {
    const params = new URLSearchParams();
    const merged = { q, action: actionFilter, org: orgFilter, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/admin/audit?${qs}` : "/admin/audit";
  }

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <ScrollText className="size-5" /> Audit log
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Platform-brede activiteit. {total.toLocaleString("nl-NL")} regels
              totaal.
            </p>
          </div>
          <form action="/admin/audit" className="flex w-full max-w-2xl flex-wrap gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Filter zichtbare regels (actor, id, resource…)"
                className="block h-10 w-full rounded-md border border-border bg-card pr-3 pl-9 text-sm outline-none focus:ring-3 focus:ring-primary/20"
              />
            </div>
            <select
              name="action"
              defaultValue={actionFilter}
              className="h-10 rounded-md border border-border bg-card px-2 text-sm outline-none"
            >
              <option value="">Alle acties</option>
              {actionPrefixes.map((p) => (
                <option key={p} value={p}>
                  {p}.*
                </option>
              ))}
            </select>
            {orgFilter && (
              <Link
                href={buildHref({ org: undefined })}
                className="inline-flex h-10 items-center rounded-md border border-border bg-card px-3 text-sm hover:bg-accent"
              >
                Org-filter wissen
              </Link>
            )}
          </form>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Geen regels.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2">Tijd</th>
                  <th className="px-4 py-2">Actie</th>
                  <th className="px-4 py-2">Actor</th>
                  <th className="px-4 py-2">Organisatie</th>
                  <th className="px-4 py-2">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((log) => {
                  const actor = log.actorUserId ? actorMap.get(log.actorUserId) : null;
                  const org = log.organizationId ? orgMap.get(log.organizationId) : null;
                  const meta = describeMetadata(log.metadata);
                  return (
                    <tr key={log.id} className="align-top hover:bg-muted/40">
                      <td className="px-4 py-2.5 text-xs whitespace-nowrap text-muted-foreground">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{describeAction(log.action)}</div>
                        <div className="text-[11px] font-mono text-muted-foreground">
                          {log.action}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {actor ? (
                          <Link
                            href={`/admin/users?q=${encodeURIComponent(actor.email)}`}
                            className="hover:underline"
                          >
                            {actor.name ?? actor.email}
                          </Link>
                        ) : (
                          <span className="italic text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {org ? (
                          <Link
                            href={`/admin/organizations/${org.id}`}
                            className="hover:underline"
                          >
                            {org.name}
                          </Link>
                        ) : (
                          <span className="italic text-muted-foreground">platform</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
                        {meta || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Pagina {pageNum} van {totalPages}
            </span>
            <div className="flex gap-2">
              {pageNum > 1 && (
                <Link
                  href={buildHref({ page: String(pageNum - 1) })}
                  className="rounded-md border border-border px-3 py-1.5 hover:bg-accent"
                >
                  Vorige
                </Link>
              )}
              {pageNum < totalPages && (
                <Link
                  href={buildHref({ page: String(pageNum + 1) })}
                  className="rounded-md border border-border px-3 py-1.5 hover:bg-accent"
                >
                  Volgende
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
