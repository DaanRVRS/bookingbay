import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { db } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { PLAN_LIMITS } from "@/lib/plans";
import { OrgPlanForm } from "./plan-form";
import { ExtendTrialForm } from "./extend-trial-form";

export const metadata = { title: "Organisatie" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminOrgDetailPage({ params }: PageProps) {
  const { id } = await params;

  const org = await db.organization.findUnique({
    where: { id },
    include: {
      memberships: {
        include: { user: { select: { id: true, name: true, email: true, isAdmin: true } } },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      },
      _count: {
        select: { items: true, bookings: true, leads: true, customers: true, categories: true },
      },
    },
  });
  if (!org) notFound();

  const adminHost = (process.env.NEXTAUTH_URL ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const protocol = (process.env.NEXTAUTH_URL ?? "").startsWith("https") ? "https" : "http";
  const tenantUrl = adminHost ? `${protocol}://${org.slug}.${adminHost}` : `/site/${org.slug}`;

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin/organizations"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          Alle organisaties
        </Link>

        <div className="mt-4 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{org.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-mono">{org.slug}</span>
              {" · "}
              <a
                href={tenantUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
              >
                {tenantUrl}
                <ExternalLink className="size-3" />
              </a>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Aangemaakt {format(org.createdAt, "d MMM yyyy", { locale: nl })}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Items" value={org._count.items} />
          <Stat label="Categorieën" value={org._count.categories} />
          <Stat label="Klanten" value={org._count.customers} />
          <Stat label="Boekingen" value={org._count.bookings} />
          <Stat label="Leads" value={org._count.leads} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Plan + trial */}
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-base font-semibold">Plan & trial</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Wijzig direct het abonnement (zonder Mollie).
            </p>
            <div className="mt-5 flex flex-col gap-4">
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Huidig
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {PLAN_LIMITS[org.plan].label}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    €{PLAN_LIMITS[org.plan].monthlyPriceEuro}/mnd
                  </span>
                </p>
                {org.trialEndsAt && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Trial loopt tot{" "}
                    {format(org.trialEndsAt, "d MMM yyyy", { locale: nl })}
                  </p>
                )}
                {org.subscriptionStatus && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Mollie-status: {org.subscriptionStatus}
                  </p>
                )}
              </div>
              <OrgPlanForm organizationId={org.id} currentPlan={org.plan} />
              <ExtendTrialForm organizationId={org.id} />
            </div>
          </section>

          {/* Members */}
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-base font-semibold">
              Leden{" "}
              <span className="ml-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {org.memberships.length}
              </span>
            </h2>
            <ul className="mt-4 divide-y divide-border">
              {org.memberships.map((m) => {
                const initials = (m.user.name ?? m.user.email)
                  .split(" ")
                  .map((s) => s[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <li key={m.id} className="flex items-center gap-3 py-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      {initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate text-sm font-medium">
                        {m.user.name ?? m.user.email.split("@")[0]}
                        {m.user.isAdmin && (
                          <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            Platform-admin
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{m.user.email}</p>
                    </div>
                    <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium uppercase">
                      {ROLE_LABELS[m.role]}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
