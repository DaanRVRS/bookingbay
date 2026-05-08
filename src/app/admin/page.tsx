import Link from "next/link";
import { Bell, Building2, Calendar, Inbox, Mail, Package, Users } from "lucide-react";
import { format, subDays, subMonths } from "date-fns";
import { nl } from "date-fns/locale";
import { db } from "@/lib/db";
import { listDueReminders } from "@/lib/admin/crm/queries";

export const metadata = { title: "Overzicht" };

export default async function AdminOverviewPage() {
  const now = new Date();
  const monthAgo = subMonths(now, 1);
  const weekAgo = subDays(now, 7);

  const [
    orgCount,
    userCount,
    bookingCount,
    leadCount,
    itemCount,
    orgsThisMonth,
    usersThisWeek,
    recentOrgs,
    planBreakdown,
    dueReminders,
  ] = await Promise.all([
    db.organization.count(),
    db.user.count(),
    db.booking.count(),
    db.lead.count(),
    db.item.count(),
    db.organization.count({ where: { createdAt: { gte: monthAgo } } }),
    db.user.count({ where: { createdAt: { gte: weekAgo } } }),
    db.organization.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        createdAt: true,
        _count: { select: { items: true, memberships: true } },
      },
    }),
    db.organization.groupBy({
      by: ["plan"],
      _count: { _all: true },
    }),
    listDueReminders(now),
  ]);

  const overdueCount = dueReminders.filter((r) => r.dueAt < now).length;

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-2xl font-semibold tracking-tight">Platform-overzicht</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Globale statistieken voor BookingBay als geheel.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat icon={Building2} label="Organisaties" value={orgCount} delta={`+${orgsThisMonth} / 30d`} />
          <Stat icon={Users} label="Gebruikers" value={userCount} delta={`+${usersThisWeek} / 7d`} />
          <Stat icon={Package} label="Items" value={itemCount} />
          <Stat icon={Calendar} label="Boekingen" value={bookingCount} />
          <Stat icon={Inbox} label="Leads" value={leadCount} />
        </div>

        {/* CRM follow-ups widget */}
        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between pb-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Bell
                className={`size-4 ${overdueCount > 0 ? "text-destructive" : "text-muted-foreground"}`}
              />
              CRM follow-ups vandaag
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {dueReminders.length}
              </span>
              {overdueCount > 0 && (
                <span className="rounded-md bg-destructive/15 px-1.5 py-0.5 text-[11px] font-medium text-destructive">
                  {overdueCount} te laat
                </span>
              )}
            </h2>
          </div>
          {dueReminders.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 px-2 py-4 text-center text-xs text-muted-foreground">
              <p>Niets staat open voor vandaag.</p>
              <p>
                Reminders maak je per organisatie aan:{" "}
                <Link
                  href="/admin/organizations"
                  className="font-medium text-primary hover:underline"
                >
                  open een organisatie
                </Link>{" "}
                → CRM-sectie → &ldquo;Plan een follow-up&rdquo;.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {dueReminders.slice(0, 8).map((r) => {
                const overdue = r.dueAt < now;
                return (
                  <li key={r.id} className="py-2">
                    <Link
                      href={`/admin/organizations/${r.organization.id}`}
                      className="flex items-center gap-3 text-sm hover:bg-accent/40 rounded-md -mx-2 px-2 py-1"
                    >
                      <span
                        className={`size-1.5 shrink-0 rounded-full ${overdue ? "bg-destructive" : "bg-primary"}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{r.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {r.organization.name}
                          {r.assignedTo && (
                            <> · {r.assignedTo.name ?? r.assignedTo.email}</>
                          )}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 text-xs tabular-nums ${
                          overdue ? "font-medium text-destructive" : "text-muted-foreground"
                        }`}
                      >
                        {format(r.dueAt, "EEE d MMM HH:mm", { locale: nl })}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <section className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
            <div className="flex items-center justify-between pb-3">
              <h2 className="text-sm font-semibold">Recente organisaties</h2>
              <Link
                href="/admin/organizations"
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Alle →
              </Link>
            </div>
            <ul className="divide-y divide-border">
              {recentOrgs.length === 0 ? (
                <li className="py-4 text-center text-sm text-muted-foreground">Nog geen orgs.</li>
              ) : (
                recentOrgs.map((o) => (
                  <li key={o.id} className="py-3">
                    <Link
                      href={`/admin/organizations/${o.id}`}
                      className="flex items-center gap-3 text-sm hover:underline"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-[11px] font-semibold text-primary uppercase">
                        {o.name.slice(0, 2)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{o.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {o.slug} · {o._count.memberships} leden · {o._count.items} items
                        </span>
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase">
                        {o.plan}
                      </span>
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        {format(o.createdAt, "d MMM", { locale: nl })}
                      </span>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">Plan-verdeling</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {(["STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"] as const).map((p) => {
                const found = planBreakdown.find((b) => b.plan === p);
                const n = found?._count._all ?? 0;
                const pct = orgCount === 0 ? 0 : Math.round((n / orgCount) * 100);
                return (
                  <li key={p} className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {p}
                    </span>
                    <span className="flex flex-1 items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <span
                          className="block h-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      <span className="w-10 text-right tabular-nums">{n}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-5 text-xs text-muted-foreground">
          <p className="flex items-center gap-2">
            <Mail className="size-3.5" />
            Email-config: SMTP via Zoho (zie server <code>/etc/bookingbay/.env.production</code>).
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  delta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  delta?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between text-muted-foreground">
        <p className="text-xs font-medium tracking-wide uppercase">{label}</p>
        <Icon className="size-4" />
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      {delta && <p className="mt-1 text-xs text-muted-foreground">{delta}</p>}
    </div>
  );
}
