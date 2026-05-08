import Link from "next/link";
import { ArrowRight, CheckCircle2, Globe, Layers, Package, Users } from "lucide-react";
import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { addDays, startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";
import { cn } from "@/lib/utils";

export const metadata = { title: "Overzicht" };

export default async function DashboardOverviewPage() {
  const ctx = await requireOrg();
  const orgId = ctx.organization.id;

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const [
    bookingsToday,
    bookingsThisWeek,
    itemCount,
    customerCount,
    categoryCount,
    upcoming,
  ] = await Promise.all([
    db.booking.count({
      where: {
        organizationId: orgId,
        startAt: { gte: todayStart, lte: todayEnd },
        status: { in: ["CONFIRMED", "IN_PROGRESS"] },
      },
    }),
    db.booking.count({
      where: {
        organizationId: orgId,
        startAt: { gte: weekStart, lte: weekEnd },
      },
    }),
    db.item.count({ where: { organizationId: orgId, isActive: true } }),
    db.customer.count({ where: { organizationId: orgId } }),
    db.category.count({ where: { organizationId: orgId } }),
    db.booking.findMany({
      where: {
        organizationId: orgId,
        startAt: { gte: now, lte: addDays(now, 7) },
        status: { in: ["CONFIRMED", "PENDING"] },
      },
      include: { item: { select: { name: true } }, customer: { select: { name: true } } },
      orderBy: { startAt: "asc" },
      take: 5,
    }),
  ]);

  const isEmpty = itemCount === 0 && bookingsThisWeek === 0;

  const firstName = ctx.user.name?.split(" ")[0] ?? "daar";
  const greeting = pickGreeting(now);

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Overzicht</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Hier draait je verhuur deze week — alles in één blik.
          </p>
        </div>

        {isEmpty ? (
          <EmptyState orgName={ctx.organization.name} />
        ) : (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi
                label="Vandaag"
                value={bookingsToday}
                hint="lopende boekingen"
                icon={CheckCircle2}
                emphasized
              />
              <Kpi
                label="Deze week"
                value={bookingsThisWeek}
                hint="totaal boekingen"
                icon={CheckCircle2}
              />
              <Kpi label="Catalogus" value={itemCount} hint="actieve items" icon={Package} />
              <Kpi label="Klanten" value={customerCount} hint="totaal" icon={Users} />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-primary/8 via-primary/3 to-transparent px-5 py-3">
                  <h2 className="text-base font-semibold">Komende boekingen</h2>
                  <Link
                    href="/dashboard/bookings"
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Alle boekingen <ArrowRight className="size-3" />
                  </Link>
                </div>
                <div className="p-5">
                  {upcoming.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-background/50 px-5 py-10 text-center text-sm text-muted-foreground">
                      Geen geplande boekingen voor de komende 7 dagen.
                    </div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {upcoming.map((b) => (
                        <li
                          key={b.id}
                          className="flex items-center justify-between py-3 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{b.item.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {b.customer.name}
                            </p>
                          </div>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {b.startAt.toLocaleString("nl-NL", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <SecondaryStats categoryCount={categoryCount} slug={ctx.organization.slug} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function pickGreeting(d: Date) {
  const h = d.getHours();
  if (h < 6) return "Nog wakker";
  if (h < 12) return "Goedemorgen";
  if (h < 18) return "Goedemiddag";
  return "Goedenavond";
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  emphasized,
}: {
  label: string;
  value: number;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  emphasized?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5">
      {emphasized && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-primary/10 blur-2xl"
        />
      )}
      <div className="flex items-center justify-between text-muted-foreground">
        <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
        <Icon className="size-4" />
      </div>
      <p
        className={cn(
          "mt-2 text-3xl font-semibold tracking-tight tabular-nums",
          emphasized && "text-primary",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function SecondaryStats({ categoryCount, slug }: { categoryCount: number; slug: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Klantsite
        </p>
        <Link
          href={`${env.APP_URL.startsWith("https") ? "https" : "http"}://${slug}.${env.TENANT_DOMAIN}`}
          target="_blank"
          className="mt-2 flex items-center gap-2 text-sm font-medium hover:underline"
        >
          <Globe className="size-4 text-muted-foreground" />
          {slug}.{env.TENANT_DOMAIN}
        </Link>
        <p className="mt-2 text-xs text-muted-foreground">
          Open in nieuw tabblad om te zien wat je klanten zien.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Catalogus
        </p>
        <p className="mt-2 flex items-center gap-2 text-sm font-medium">
          <Layers className="size-4 text-muted-foreground" />
          {categoryCount} {categoryCount === 1 ? "categorie" : "categorieën"}
        </p>
        <Link
          href="/dashboard/categories"
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Beheren <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}

function EmptyState({ orgName }: { orgName: string }) {
  const steps = [
    {
      title: "Voeg je eerste items toe",
      body: "Boten, fietsen, gereedschap — wat je ook verhuurt.",
      href: "/dashboard/items",
      icon: Package,
    },
    {
      title: "Maak een klant aan",
      body: "Vul snel toe tijdens een boeking, of voeg vooraf je vaste klanten toe.",
      href: "/dashboard/customers",
      icon: Users,
    },
    {
      title: "Boek je eerste reservering",
      body: "Klik op een dag in de planning of gebruik 'Nieuwe boeking'.",
      href: "/dashboard/bookings",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="mt-8">
      <div className="rounded-2xl border border-dashed border-border bg-card p-8">
        <div className="max-w-xl">
          <h2 className="text-xl font-semibold tracking-tight">
            {orgName} is leeg — laten we 'm vullen
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Drie korte stapjes en je werkruimte is operationeel.
          </p>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {steps.map((s, i) => (
            <Link
              key={s.href}
              href={s.href}
              className="group relative flex flex-col rounded-xl border border-border bg-background p-5 transition-colors hover:bg-accent"
            >
              <span className="absolute top-3 right-3 grid size-6 place-items-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                {i + 1}
              </span>
              <s.icon className="size-5 text-primary" />
              <h3 className="mt-3 text-sm font-semibold">{s.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                Aan de slag <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
