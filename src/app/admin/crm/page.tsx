import Link from "next/link";
import { ArrowRight, Building2, Mail, Phone, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import {
  PROSPECT_STATUSES,
  getProspectStatusCounts,
  listProspects,
  safeTags,
} from "@/lib/admin/prospects/queries";
import { NewProspectDialog } from "./new-prospect-dialog";

export const metadata = { title: "CRM" };

export default async function AdminCrmPage() {
  const [prospects, statusCounts] = await Promise.all([
    listProspects(),
    getProspectStatusCounts(),
  ]);

  // Group by status for the kanban-ish display.
  const byStatus = new Map<string, typeof prospects>();
  for (const s of PROSPECT_STATUSES) byStatus.set(s.value, []);
  for (const p of prospects) {
    if (!byStatus.has(p.status)) byStatus.set(p.status, []);
    byStatus.get(p.status)!.push(p);
  }

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">CRM — Prospects</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track potentiële klanten van eerste contact tot ondertekening.
              Bestaande klanten beheer je op{" "}
              <Link href="/admin/organizations" className="text-primary hover:underline">
                /admin/organizations
              </Link>
              .
            </p>
          </div>
          <NewProspectDialog
            trigger={
              <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
                <Plus className="size-4" /> Nieuwe prospect
              </button>
            }
          />
        </div>

        {/* Status overview */}
        <div className="mt-6 grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
          {PROSPECT_STATUSES.map((s) => (
            <div
              key={s.value}
              className="rounded-lg border border-border bg-card p-3"
            >
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {s.label}
              </p>
              <p
                className="mt-1 text-2xl font-semibold tabular-nums"
                style={{ color: s.color }}
              >
                {statusCounts[s.value] ?? 0}
              </p>
            </div>
          ))}
        </div>

        {/* Pipeline columns */}
        <div className="mt-6 grid gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {PROSPECT_STATUSES.map((s) => {
            const list = byStatus.get(s.value) ?? [];
            if (list.length === 0 && (s.value === "verloren" || s.value === "gewonnen"))
              return null;
            return (
              <section
                key={s.value}
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                <div
                  className="flex items-center justify-between border-b border-border px-4 py-2"
                  style={{ background: `color-mix(in oklch, ${s.color} 12%, transparent)` }}
                >
                  <h2 className="text-xs font-semibold uppercase tracking-wider">
                    {s.label}
                  </h2>
                  <span className="rounded-md bg-background px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                    {list.length}
                  </span>
                </div>
                {list.length === 0 ? (
                  <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                    Geen prospects in deze stage.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {list.map((p) => (
                      <li key={p.id}>
                        <Link
                          href={`/admin/crm/${p.id}`}
                          className="flex flex-col gap-1 px-4 py-3 hover:bg-accent/40"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="truncate text-sm font-medium">
                              {p.name}
                            </span>
                            <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                          </div>
                          {p.companyName && (
                            <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                              <Building2 className="size-3 shrink-0" />
                              {p.companyName}
                            </span>
                          )}
                          {(p.email || p.phone) && (
                            <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                              {p.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="size-3" />
                                  {p.email}
                                </span>
                              )}
                              {p.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="size-3" />
                                  {p.phone}
                                </span>
                              )}
                            </span>
                          )}
                          {safeTags(p.tags).length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {safeTags(p.tags).map((t) => (
                                <span
                                  key={t}
                                  className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>
                              {p._count.reminders > 0
                                ? `${p._count.reminders} open follow-up${p._count.reminders === 1 ? "" : "s"}`
                                : `${p._count.interactions} interactie${p._count.interactions === 1 ? "" : "s"}`}
                            </span>
                            <span className="tabular-nums">
                              {formatDistanceToNow(p.updatedAt, {
                                addSuffix: true,
                                locale: nl,
                              })}
                            </span>
                          </div>
                          {p.convertedOrg && (
                            <span className="text-[10px] text-primary">
                              → {p.convertedOrg.name}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>

        {prospects.length === 0 && (
          <div className="mt-10 rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              Nog geen prospects. Voeg je eerste lead toe.
            </p>
            <div className="mt-4">
              <NewProspectDialog
                trigger={
                  <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
                    <Plus className="size-4" /> Nieuwe prospect
                  </button>
                }
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

