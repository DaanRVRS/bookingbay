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

const ROLE_NL: Record<string, string> = {
  OWNER: "Eigenaar",
  ADMIN: "Beheerder",
  MANAGER: "Manager",
  VIEWER: "Lezer",
};

const PLAN_NL: Record<string, string> = {
  STARTER: "Starter",
  PROFESSIONAL: "Professional",
  BUSINESS: "Business",
  ENTERPRISE: "Enterprise",
};

function nlRole(r: unknown): string {
  return typeof r === "string" ? (ROLE_NL[r] ?? r) : "";
}
function nlPlan(p: unknown): string {
  return typeof p === "string" ? (PLAN_NL[p] ?? p) : "";
}

function nlDate(iso: unknown): string {
  if (typeof iso !== "string") return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function describeMetadata(action: string, meta: unknown): string {
  if (!meta || typeof meta !== "object") return "";
  const m = meta as Record<string, unknown>;

  switch (action) {
    case "booking.move": {
      const to = m.to as Record<string, unknown> | undefined;
      const from = m.from as Record<string, unknown> | undefined;
      const parts: string[] = [];
      if (to?.startAt) parts.push(`naar ${nlDate(to.startAt)}`);
      if (from?.itemId && to?.itemId && from.itemId !== to.itemId) {
        parts.push("ander item");
      }
      return parts.join(" · ");
    }
    case "page.update": {
      if (m.kind === "blocks") {
        const n = m.blockCount;
        return typeof n === "number" ? `${n} blok${n === 1 ? "" : "ken"}` : "blokken bijgewerkt";
      }
      if (m.kind === "settings") return "instellingen bijgewerkt";
      return "";
    }
    case "member.role.update": {
      const from = nlRole(m.from);
      const to = nlRole(m.to);
      if (from && to) return `${from} → ${to}`;
      return "";
    }
    case "member.invite": {
      const email = typeof m.email === "string" ? m.email : "";
      const role = nlRole(m.role);
      if (email && role) return `${email} · ${role}`;
      return email || role;
    }
    case "member.invite.accept": {
      const role = nlRole(m.role);
      return role ? `als ${role}` : "";
    }
    case "member.invite.cancel":
    case "member.remove": {
      return typeof m.email === "string" ? m.email : "";
    }
    case "org.plan.change": {
      const from = nlPlan(m.from);
      const to = nlPlan(m.to);
      const parts: string[] = [];
      if (from && to) parts.push(`${from} → ${to}`);
      if (m.mode === "trial" && typeof m.days === "number") parts.push(`trial ${m.days}d`);
      else if (m.mode === "paid" && typeof m.days === "number") parts.push(`betaald +${m.days}d`);
      return parts.join(" · ");
    }
    case "org.trial.extend":
    case "org.payment.extend": {
      return typeof m.days === "number" ? `+${m.days} dagen` : "";
    }
    case "item.create":
    case "item.update":
    case "item.delete":
    case "category.create":
    case "category.update":
    case "category.delete":
    case "customer.create":
    case "customer.update":
    case "customer.delete":
    case "page.create":
    case "page.delete":
    case "review.create":
    case "review.update":
    case "review.delete": {
      if (typeof m.name === "string") return m.name;
      if (typeof m.title === "string") return m.title;
      if (typeof m.email === "string") return m.email;
      return "";
    }
    case "booking.create":
    case "booking.update":
    case "booking.cancel":
    case "booking.status": {
      const parts: string[] = [];
      if (typeof m.itemName === "string") parts.push(m.itemName);
      if (typeof m.customerName === "string") parts.push(m.customerName);
      if (typeof m.status === "string") parts.push(m.status);
      return parts.join(" · ");
    }
    case "lead.create":
    case "lead.handle":
    case "lead.delete": {
      if (typeof m.email === "string") return m.email;
      if (typeof m.name === "string") return m.name;
      return "";
    }
  }

  // Fallback: tonen we nog wel — maar zonder technische IDs.
  const SKIP = new Set([
    "byAdmin",
    "itemId",
    "userId",
    "targetUserId",
    "leadId",
    "bookingId",
    "customerId",
    "categoryId",
    "pageId",
    "reviewId",
    "organizationId",
  ]);
  const entries = Object.entries(m)
    .filter(([k]) => !SKIP.has(k))
    .slice(0, 3)
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
                const meta = describeMetadata(log.action, log.metadata);
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
                      {meta && <span>{meta}</span>}
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
