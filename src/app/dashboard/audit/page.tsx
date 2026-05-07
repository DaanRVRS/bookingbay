import Link from "next/link";
import { notFound } from "next/navigation";
import { ScrollText } from "lucide-react";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { describeAction } from "@/lib/audit/log";

export const metadata = { title: "Activiteitenlogboek" };

const PAGE_SIZE = 50;

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
    .filter(([k]) => k !== "byAdmin")
    .slice(0, 4)
    .map(([k, v]) => {
      let str: string;
      if (v === null || v === undefined) str = "—";
      else if (typeof v === "object") str = JSON.stringify(v);
      else str = String(v);
      if (str.length > 60) str = str.slice(0, 57) + "…";
      return `${k}: ${str}`;
    });
  return entries.join(" · ");
}

export default async function OrgAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const ctx = await requireOrg();
  if (!can(ctx.membership.role, "members:manage")) {
    notFound();
  }

  const sp = await searchParams;
  const pageNum = Math.max(1, Number(sp.page ?? "1") || 1);
  const skip = (pageNum - 1) * PAGE_SIZE;

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip,
    }),
    db.auditLog.count({ where: { organizationId: ctx.organization.id } }),
  ]);

  const actorIds = Array.from(
    new Set(logs.map((l) => l.actorUserId).filter((x): x is string => Boolean(x))),
  );
  const actors = actorIds.length
    ? await db.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const actorMap = new Map(actors.map((a) => [a.id, a]));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <div className="border-b border-border pb-5">
          <div className="flex items-center gap-2">
            <ScrollText className="size-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">Activiteitenlogboek</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Alle wijzigingen binnen <strong>{ctx.organization.name}</strong>.
          </p>
        </div>

        <section className="overflow-hidden rounded-xl border border-border bg-card">
          {logs.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Nog geen activiteit geregistreerd.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {logs.map((log) => {
                const actor = log.actorUserId ? actorMap.get(log.actorUserId) : null;
                const meta = describeMetadata(log.metadata);
                return (
                  <li key={log.id} className="flex flex-col gap-1 px-5 py-3 text-sm">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="font-medium">{describeAction(log.action)}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(log.createdAt)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Door:{" "}
                        {actor ? (
                          <span className="text-foreground">
                            {actor.name ?? actor.email}
                          </span>
                        ) : (
                          <span className="italic">systeem of bezoeker</span>
                        )}
                      </span>
                      {meta && <span className="font-mono text-[11px]">{meta}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Pagina {pageNum} van {totalPages} ({total} regels)
            </span>
            <div className="flex gap-2">
              {pageNum > 1 && (
                <Link
                  href={`/dashboard/audit?page=${pageNum - 1}`}
                  className="rounded-md border border-border px-3 py-1.5 hover:bg-accent"
                >
                  Vorige
                </Link>
              )}
              {pageNum < totalPages && (
                <Link
                  href={`/dashboard/audit?page=${pageNum + 1}`}
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
