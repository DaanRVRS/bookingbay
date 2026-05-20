import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { db } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { PLAN_LIMITS, formatEuroNL } from "@/lib/plans";
import { describeAction } from "@/lib/audit/log";
import { OrgPlanForm } from "./plan-form";
import { ExtendTrialForm } from "./extend-trial-form";
import { PaidUntilForm } from "./paid-until-form";
import { AdminOrgEditForm } from "./edit-form";
import { AdminOrgDeleteForm } from "./delete-form";
import { ImpersonateButton } from "./impersonate-button";
import { CrmSection } from "./crm-section";
import { IntegrationsSection } from "./integrations-section";

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
  // Pull CRM fields explicitly — they're outside the include above.
  const crm = await db.organization.findUnique({
    where: { id },
    select: { crmStatus: true, crmTags: true },
  });

  const recentLogs = await db.auditLog.findMany({
    where: { organizationId: id },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Items" value={org._count.items} />
        <Stat label="Categorieën" value={org._count.categories} />
        <Stat label="Klanten" value={org._count.customers} />
        <Stat label="Boekingen" value={org._count.bookings} />
        <Stat label="Leads" value={org._count.leads} />
      </div>

      <CrmSection
        organizationId={org.id}
        crmStatus={crm?.crmStatus ?? "active"}
        crmTags={crm?.crmTags ?? []}
      />

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
                  {formatEuroNL(PLAN_LIMITS[org.plan].monthlyPriceEuro)}/mnd
                  incl. btw
                </span>
              </p>
              {org.trialEndsAt && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Trial loopt tot{" "}
                  {format(org.trialEndsAt, "d MMM yyyy", { locale: nl })}
                </p>
              )}
              {org.paidUntil && (
                <p
                  className={`mt-1 text-xs ${
                    org.suspendedAt
                      ? "text-destructive"
                      : org.paidUntil < new Date()
                        ? "text-[oklch(0.55_0.16_70)]"
                        : "text-muted-foreground"
                  }`}
                >
                  Betaald tot{" "}
                  {format(org.paidUntil, "d MMM yyyy", { locale: nl })}
                  {org.suspendedAt && " · gesuspendeerd"}
                  {org.paymentReminderStage > 0 && !org.suspendedAt && (
                    <> · reminder fase {org.paymentReminderStage}/3</>
                  )}
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
            <PaidUntilForm
              organizationId={org.id}
              isSuspended={Boolean(org.suspendedAt)}
            />
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
                  <ImpersonateButton
                    userId={m.user.id}
                    userLabel={m.user.name ?? m.user.email}
                  />
                </li>
              );
            })}
          </ul>
        </section>

        {/* Edit organization */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold">Organisatie bewerken</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Pas de naam en URL-slug van deze klant aan.
          </p>
          <div className="mt-5">
            <AdminOrgEditForm
              organizationId={org.id}
              initialName={org.name}
              initialSlug={org.slug}
            />
          </div>
        </section>

        {/* Koppelingen */}
        <div className="lg:col-span-2">
          <IntegrationsSection organizationId={org.id} />
        </div>

        {/* Recent activity */}
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Recente activiteit</h2>
            <Link
              href={`/admin/audit?org=${org.id}`}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Volledig log →
            </Link>
          </div>
          {recentLogs.length === 0 ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Nog geen activiteit gelogd.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border text-sm">
              {recentLogs.map((l) => (
                <li key={l.id} className="flex items-baseline justify-between gap-2 py-2">
                  <span>{describeAction(l.action)}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {format(l.createdAt, "d MMM HH:mm", { locale: nl })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Danger zone */}
      <section className="mt-6 rounded-xl border border-destructive/40 bg-destructive/5 p-6">
        <h2 className="text-base font-semibold text-destructive">Gevarenzone</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Verwijdert deze organisatie inclusief alle items, boekingen, klanten,
          leden en pages — onomkeerbaar.
        </p>
        <div className="mt-4">
          <AdminOrgDeleteForm
            organizationId={org.id}
            organizationName={org.name}
          />
        </div>
      </section>
    </>
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
