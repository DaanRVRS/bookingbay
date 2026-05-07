import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { BookingStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { HistoryDetails } from "../history-details";

export const metadata = { title: "Boekingen" };

const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: "In behandeling",
  CONFIRMED: "Bevestigd",
  IN_PROGRESS: "Loopt",
  COMPLETED: "Afgerond",
  CANCELED: "Geannuleerd",
};

const STATUS_COLORS: Record<BookingStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-900",
  CONFIRMED: "bg-blue-100 text-blue-900",
  IN_PROGRESS: "bg-emerald-100 text-emerald-900",
  COMPLETED: "bg-muted text-muted-foreground",
  CANCELED: "bg-destructive/10 text-destructive",
};

const STATUS_VALUES = [
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELED",
] as const satisfies readonly BookingStatus[];

const PAGE_SIZE = 100;

export default async function AdminOrgBookingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const statusFilter = (sp.status ?? "").trim();
  const pageNum = Math.max(1, Number(sp.page ?? "1") || 1);
  const skip = (pageNum - 1) * PAGE_SIZE;

  const org = await db.organization.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!org) notFound();

  const where = {
    organizationId: id,
    ...(statusFilter && (STATUS_VALUES as readonly string[]).includes(statusFilter)
      ? { status: statusFilter as BookingStatus }
      : {}),
  };

  const [bookings, total] = await Promise.all([
    db.booking.findMany({
      where,
      include: {
        item: { select: { name: true } },
        customer: { select: { name: true, email: true } },
        createdBy: { select: { email: true, name: true } },
      },
      orderBy: { startAt: "desc" },
      take: PAGE_SIZE,
      skip,
    }),
    db.booking.count({ where }),
  ]);

  const auditLogs = await db.auditLog.findMany({
    where: {
      organizationId: id,
      OR: [{ resource: "booking" }, { action: { startsWith: "booking." } }],
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
  for (const log of auditLogs) {
    const key = log.resourceId ?? "";
    if (!key) continue;
    const list = historyById.get(key) ?? [];
    list.push(log);
    historyById.set(key, list);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const exportHref = `/api/admin/organizations/${id}/export/bookings`;

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Boekingen</h2>
          <p className="text-xs text-muted-foreground">
            {total} totaal {statusFilter && `(filter: ${STATUS_LABELS[statusFilter as BookingStatus] ?? statusFilter})`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action="" className="flex gap-1">
            <select
              name="status"
              defaultValue={statusFilter}
              className="h-9 rounded-md border border-border bg-card px-2 text-sm outline-none"
            >
              <option value="">Alle statussen</option>
              {STATUS_VALUES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-9 rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-accent"
            >
              Filter
            </button>
          </form>
          <a
            href={exportHref}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-accent"
          >
            <Download className="size-3.5" />
            Download CSV
          </a>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        {bookings.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            Geen boekingen.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-2">Periode</th>
                <th className="px-4 py-2">Item</th>
                <th className="px-4 py-2">Klant</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Bedrag</th>
                <th className="px-4 py-2">Door</th>
                <th className="px-4 py-2">Historie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bookings.map((b) => (
                <tr key={b.id} className="align-top hover:bg-muted/40">
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    <div>{format(b.startAt, "d MMM yyyy HH:mm", { locale: nl })}</div>
                    <div className="text-muted-foreground">
                      tot {format(b.endAt, "d MMM yyyy HH:mm", { locale: nl })}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">{b.item.name}</td>
                  <td className="px-4 py-3 text-xs">
                    <div className="font-medium">{b.customer.name}</div>
                    {b.customer.email && (
                      <div className="text-muted-foreground">{b.customer.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[b.status]}`}
                    >
                      {STATUS_LABELS[b.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    €{b.totalPrice.toString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {b.createdBy.name ?? b.createdBy.email}
                  </td>
                  <td className="px-4 py-3">
                    <HistoryDetails
                      entries={historyById.get(b.id) ?? []}
                      actorMap={actorMap}
                    />
                  </td>
                </tr>
              ))}
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
                href={`/admin/organizations/${id}/bookings?${new URLSearchParams({ ...(statusFilter && { status: statusFilter }), page: String(pageNum - 1) }).toString()}`}
                className="rounded-md border border-border px-3 py-1.5 hover:bg-accent"
              >
                Vorige
              </Link>
            )}
            {pageNum < totalPages && (
              <Link
                href={`/admin/organizations/${id}/bookings?${new URLSearchParams({ ...(statusFilter && { status: statusFilter }), page: String(pageNum + 1) }).toString()}`}
                className="rounded-md border border-border px-3 py-1.5 hover:bg-accent"
              >
                Volgende
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
