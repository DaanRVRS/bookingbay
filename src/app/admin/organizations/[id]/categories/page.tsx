import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { db } from "@/lib/db";
import { HistoryDetails } from "../history-details";

export const metadata = { title: "Categorieën" };

export default async function AdminOrgCategoriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const org = await db.organization.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!org) notFound();

  const categories = await db.category.findMany({
    where: { organizationId: id },
    include: {
      parent: { select: { name: true } },
      _count: { select: { items: true, children: true } },
    },
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
  });

  const auditLogs = await db.auditLog.findMany({
    where: {
      organizationId: id,
      OR: [{ resource: "category" }, { action: { startsWith: "category." } }],
    },
    orderBy: { createdAt: "desc" },
  });

  const actorIds = Array.from(
    new Set(auditLogs.map((l) => l.actorUserId).filter((x): x is string => Boolean(x))),
  );
  const actors = actorIds.length
    ? await db.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const actorMap = new Map(actors.map((a) => [a.id, a]));

  const historyById = new Map<string, typeof auditLogs>();
  const reorderEntries: typeof auditLogs = [];
  for (const log of auditLogs) {
    if (log.action === "category.reorder" && !log.resourceId) {
      reorderEntries.push(log);
      continue;
    }
    const key = log.resourceId ?? "";
    if (!key) continue;
    const list = historyById.get(key) ?? [];
    list.push(log);
    historyById.set(key, list);
  }

  const liveIds = new Set(categories.map((c) => c.id));
  const ghostIds = Array.from(historyById.keys()).filter((rid) => !liveIds.has(rid));

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Categorieën</h2>
          <p className="text-xs text-muted-foreground">
            {categories.length} actief
            {ghostIds.length > 0 && ` · ${ghostIds.length} verwijderd in historie`}
          </p>
        </div>
        <a
          href={`/api/admin/organizations/${id}/export/categories`}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-accent"
        >
          <Download className="size-3.5" />
          Download CSV
        </a>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        {categories.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            Nog geen categorieën.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-2">Naam</th>
                <th className="px-4 py-2">Bovenliggend</th>
                <th className="px-4 py-2 text-right">Items</th>
                <th className="px-4 py-2 text-right">Sub</th>
                <th className="px-4 py-2">Aangemaakt</th>
                <th className="px-4 py-2">Historie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.map((c) => (
                <tr key={c.id} className="align-top hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c.parent?.name ?? <span className="italic">root</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {c._count.items}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {c._count.children}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {format(c.createdAt, "d MMM yyyy", { locale: nl })}
                  </td>
                  <td className="px-4 py-3">
                    <HistoryDetails
                      entries={historyById.get(c.id) ?? []}
                      actorMap={actorMap}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {reorderEntries.length > 0 && (
        <section className="mt-6 rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold">Sorteer-acties</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Drag-and-drop sorteringen op categorie-niveau (geen specifieke
            categorie).
          </p>
          <div className="mt-3">
            <HistoryDetails entries={reorderEntries} actorMap={actorMap} />
          </div>
        </section>
      )}

      {ghostIds.length > 0 && (
        <section className="mt-6 rounded-xl border border-dashed border-border bg-card/40 p-4">
          <h3 className="text-sm font-semibold">Verwijderde categorieën (uit log)</h3>
          <ul className="mt-3 space-y-3 text-sm">
            {ghostIds.map((rid) => {
              const entries = historyById.get(rid) ?? [];
              const lastWithName = entries.find(
                (e) =>
                  e.metadata &&
                  typeof e.metadata === "object" &&
                  "name" in (e.metadata as Record<string, unknown>),
              );
              const name = lastWithName
                ? String(
                    (lastWithName.metadata as Record<string, unknown>).name ?? rid,
                  )
                : rid;
              return (
                <li key={rid} className="flex flex-col gap-1">
                  <span className="font-medium text-muted-foreground line-through">
                    {name}
                  </span>
                  <HistoryDetails entries={entries} actorMap={actorMap} />
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
