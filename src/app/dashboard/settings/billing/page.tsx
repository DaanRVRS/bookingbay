import Link from "next/link";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Plug,
  Sparkles,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  PLAN_LIMITS,
  planLimits,
  describeLimit,
  formatEuroNL,
} from "@/lib/plans";
import type { Plan, OrgIntegration, PaymentEvent } from "@prisma/client";
import { isMollieConfigured } from "@/lib/billing/mollie";
import { getIntegration } from "@/lib/integrations/catalog";
import { IntegrationLogo } from "@/components/integrations/IntegrationLogo";
import { IntegrationStatusBadge } from "@/components/integrations/IntegrationStatusBadge";
import {
  CancelScheduledPlanButton,
  CancelSubscriptionButton,
  ChangePlanButton,
  ResumeSubscriptionButton,
  StartCheckoutButton,
} from "./subscription-actions";

export const metadata = { title: "Plan & facturatie" };

const PLAN_ORDER: Plan[] = ["STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"];

interface PageProps {
  searchParams: Promise<{ checkout?: string }>;
}

export default async function BillingPage({ searchParams }: PageProps) {
  const ctx = await requireOrg();
  const sp = await searchParams;

  try {
  const org = await db.organization.findUnique({
    where: { id: ctx.organization.id },
    select: {
      id: true,
      plan: true,
      pendingPlan: true,
      trialEndsAt: true,
      subscriptionStatus: true,
      subscriptionId: true,
      mollieCustomerId: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      lastPaymentFailedAt: true,
      paidUntil: true,
      suspendedAt: true,
    },
  });
  if (!org) throw new Error("Organization missing");

  // Secundaire data — nooit de pagina laten crashen. Faalt één van deze
  // queries (bv. een Prisma-client die de PaymentEvent-tabel nog niet kent
  // na een halve deploy), dan rendert de pagina gewoon zonder dat blokje
  // i.p.v. een harde 500.
  let itemCount = 0;
  let memberCount = 0;
  let pageCount = 0;
  let activeIntegrations: OrgIntegration[] = [];
  let recentPayments: PaymentEvent[] = [];
  try {
    [itemCount, memberCount, pageCount, activeIntegrations, recentPayments] =
      await Promise.all([
        db.item.count({ where: { organizationId: org.id, isActive: true } }),
        db.membership.count({ where: { organizationId: org.id } }),
        // Alleen extra pagina's — de verplichte homepagina telt nergens mee.
        db.page.count({ where: { organizationId: org.id, NOT: { slug: "home" } } }),
        db.orgIntegration.findMany({
          where: { organizationId: org.id, status: "ACTIVE" },
          orderBy: { activatedAt: "asc" },
        }),
        db.paymentEvent.findMany({
          where: { organizationId: org.id, eventType: "payment.paid" },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);
  } catch (err) {
    console.warn(
      "[billing] secundaire data ophalen mislukt — pagina rendert zonder:",
      err instanceof Error ? err.message : err,
    );
  }

  const current = planLimits(org.plan);
  const integrationsTotal = activeIntegrations.reduce(
    (sum, r) => sum + r.monthlyPriceEuro,
    0,
  );
  const monthlyTotal = current.monthlyPriceEuro + integrationsTotal;

  const now = new Date();
  const inTrial = Boolean(org.trialEndsAt && org.trialEndsAt > now);
  const isSuspended = Boolean(org.suspendedAt);
  const hasMollieSubscription = Boolean(org.subscriptionId);

  // 5 mogelijke states voor de UI:
  //   "trial"           → trialing, geen sub yet
  //   "trial-expiring"  → trial, ≤ 3 dagen over
  //   "trial-expired"   → trialEndsAt voorbij, geen sub, niet suspended
  //   "active"          → Mollie sub, active, niet gecanceld
  //   "active-canceling"→ Mollie sub, cancelAtPeriodEnd true
  //   "past-due"        → sub status past_due
  //   "suspended"       → suspendedAt gevuld
  //   "legacy"          → geen Mollie sub maar wel paidUntil (oude flow)
  let state:
    | "trial"
    | "trial-expiring"
    | "trial-expired"
    | "active"
    | "active-canceling"
    | "past-due"
    | "suspended"
    | "legacy";
  if (isSuspended) state = "suspended";
  else if (org.subscriptionStatus === "past_due") state = "past-due";
  else if (hasMollieSubscription && org.cancelAtPeriodEnd) state = "active-canceling";
  else if (hasMollieSubscription && org.subscriptionStatus === "active") state = "active";
  else if (inTrial) {
    const daysLeft = org.trialEndsAt
      ? Math.ceil(
          (org.trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
        )
      : 999;
    state = daysLeft <= 3 ? "trial-expiring" : "trial";
  } else if (org.trialEndsAt && org.trialEndsAt < now && !hasMollieSubscription) {
    state = "trial-expired";
  } else if (org.paidUntil) state = "legacy";
  else state = "trial-expired";

  return (
    <div className="flex flex-col gap-6">
      {/* Flash: net terug van Mollie checkout */}
      {sp.checkout === "completed" && (
        <div className="flex items-start gap-3 rounded-lg border border-[oklch(0.7_0.13_150)]/40 bg-[oklch(0.95_0.05_150)] px-4 py-3 text-sm dark:bg-[oklch(0.3_0.08_150)]">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[oklch(0.5_0.14_150)]" />
          <p>
            <strong>Bedankt!</strong> We verwerken je betaling — zodra Mollie
            &lsquo;m bevestigd heeft staat je abonnement actief. Dat duurt
            meestal één tot twee minuten.
          </p>
        </div>
      )}

      {/* Status-card + primary CTA */}
      <SubscriptionStatusCard
        state={state}
        monthlyTotal={monthlyTotal}
        planLabel={current.label}
        planEuro={current.monthlyPriceEuro}
        integrationsEuro={integrationsTotal}
        trialEndsAt={org.trialEndsAt}
        currentPeriodEnd={org.currentPeriodEnd}
        paidUntil={org.paidUntil}
        lastPaymentFailedAt={org.lastPaymentFailedAt}
        mollieConfigured={isMollieConfigured()}
      />

      {/* Resource-stats */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Op dit plan</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Items" current={itemCount} max={describeLimit(org.plan, "items")} />
          <Stat label="Leden" current={memberCount} max={describeLimit(org.plan, "members")} />
          <Stat
            label="Extra pagina's"
            current={pageCount}
            max={describeLimit(org.plan, "pages")}
          />
          <FeatureBadge label="Site-builder" enabled={current.pageBuilder} />
          <FeatureBadge label="Eigen domein" enabled={current.customDomain} />
        </div>
      </section>

      {/* Line-items op de maandfactuur */}
      <section className="rounded-xl border border-border bg-card p-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Plug className="size-4 text-muted-foreground" />
              Maandelijkse line-items
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Dit zijn alle bedragen die elke maand worden afgeschreven.
            </p>
          </div>
          <Link
            href="/dashboard/integrations"
            className="shrink-0 text-xs font-medium text-primary hover:underline"
          >
            Koppelingen →
          </Link>
        </header>
        <ul className="mt-4 divide-y divide-border">
          <li className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium">{current.label}-abonnement</p>
              <p className="text-[11px] text-muted-foreground">
                Basisplan
              </p>
            </div>
            <span className="text-sm font-semibold tabular-nums">
              {formatEuroNL(current.monthlyPriceEuro)}
            </span>
          </li>
          {activeIntegrations.map((row) => {
            const def = getIntegration(row.integrationKey);
            if (!def) return null;
            return (
              <li key={row.id} className="flex items-center gap-3 py-3">
                <IntegrationLogo integration={def} size="sm" />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/dashboard/integrations/${def.slug}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {def.name}
                  </Link>
                  <p className="text-[11px] text-muted-foreground">
                    {row.activatedAt ? (
                      <>Actief sinds {format(row.activatedAt, "d MMM yyyy", { locale: nl })}</>
                    ) : (
                      "Net geactiveerd"
                    )}
                  </p>
                </div>
                <IntegrationStatusBadge
                  catalogStatus={def.status}
                  orgStatus={row.status}
                  size="sm"
                />
                <span className="w-20 shrink-0 text-right text-sm font-semibold tabular-nums">
                  {formatEuroNL(row.monthlyPriceEuro)}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="text-sm font-semibold">
            Totaal per maand
            <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
              incl. btw
            </span>
          </span>
          <span className="text-lg font-semibold tabular-nums">
            {formatEuroNL(monthlyTotal)}
          </span>
        </div>
      </section>

      {/* Recente betalingen */}
      {recentPayments.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold">Recente betalingen</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {recentPayments.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2.5">
                <span className="text-muted-foreground">
                  {format(p.createdAt, "d MMM yyyy", { locale: nl })}
                </span>
                <span className="font-medium tabular-nums">
                  €{((p.amountCents ?? 0) / 100).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Plan ladder */}
      <section>
        <h2 className="text-base font-semibold">Plannen</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Wissel direct van plan. Upgrades gaan meteen in — het verschil voor
          de rest van je periode wordt automatisch verrekend. Downgrades gaan
          in bij je volgende verlenging.
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {PLAN_ORDER.map((p) => (
            <PlanCard
              key={p}
              plan={p}
              current={org.plan}
              pendingPlan={org.pendingPlan}
              hasActiveSub={hasMollieSubscription && org.subscriptionStatus === "active"}
              renewalDate={org.currentPeriodEnd}
              limits={PLAN_LIMITS[p]}
            />
          ))}
        </div>
      </section>
    </div>
  );
  } catch (err) {
    // Server-side loggen (pm2-logs), gebruiker krijgt de nette
    // error-boundary (settings/error.tsx) — nooit stacktraces op scherm.
    console.error("[billing] pagina-render mislukt:", err);
    throw err;
  }
}

// ── Status card ─────────────────────────────────────────────────────────

type State =
  | "trial"
  | "trial-expiring"
  | "trial-expired"
  | "active"
  | "active-canceling"
  | "past-due"
  | "suspended"
  | "legacy";

function SubscriptionStatusCard({
  state,
  monthlyTotal,
  planLabel,
  planEuro,
  integrationsEuro,
  trialEndsAt,
  currentPeriodEnd,
  paidUntil,
  lastPaymentFailedAt,
  mollieConfigured,
}: {
  state: State;
  monthlyTotal: number;
  planLabel: string;
  planEuro: number;
  integrationsEuro: number;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  paidUntil: Date | null;
  lastPaymentFailedAt: Date | null;
  mollieConfigured: boolean;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Abonnement
          </p>
          <h2 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
            {planLabel}
            <StateBadge state={state} />
          </h2>
          <StatusLine
            state={state}
            trialEndsAt={trialEndsAt}
            currentPeriodEnd={currentPeriodEnd}
            paidUntil={paidUntil}
            lastPaymentFailedAt={lastPaymentFailedAt}
          />
        </div>
        <p className="shrink-0 text-right">
          <span className="text-2xl font-semibold tabular-nums">
            {formatEuroNL(monthlyTotal)}
          </span>
          <span className="block text-[11px] text-muted-foreground">
            per maand incl. btw
            {integrationsEuro > 0 && (
              <>
                {" · "}
                {formatEuroNL(planEuro)} plan +{" "}
                {formatEuroNL(integrationsEuro)} koppelingen
              </>
            )}
          </span>
        </p>
      </div>

      <div className="mt-5">
        <StateActions state={state} mollieConfigured={mollieConfigured} />
      </div>

      {!mollieConfigured && (state === "trial" || state === "trial-expiring" || state === "trial-expired") && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Online betalen wordt deze week aangezet. Mail{" "}
          <a className="underline" href="mailto:hallo@bookingbay.nl">hallo@bookingbay.nl</a>
          {" "}om je abonnement nu al te activeren.
        </p>
      )}
    </section>
  );
}

function StateBadge({ state }: { state: State }) {
  const cfg: Record<State, { label: string; cls: string; icon: typeof Check }> = {
    trial: {
      label: "Trial",
      cls: "bg-primary/12 text-primary",
      icon: Sparkles,
    },
    "trial-expiring": {
      label: "Trial loopt af",
      cls: "bg-[oklch(0.94_0.08_70)] text-[oklch(0.5_0.16_70)]",
      icon: Clock,
    },
    "trial-expired": {
      label: "Trial afgelopen",
      cls: "bg-destructive/15 text-destructive",
      icon: AlertTriangle,
    },
    active: {
      label: "Actief",
      cls: "bg-[oklch(0.93_0.07_150)] text-[oklch(0.4_0.14_150)]",
      icon: CheckCircle2,
    },
    "active-canceling": {
      label: "Stopt op periode-einde",
      cls: "bg-[oklch(0.94_0.08_70)] text-[oklch(0.5_0.16_70)]",
      icon: Clock,
    },
    "past-due": {
      label: "Betaling mislukt",
      cls: "bg-destructive/15 text-destructive",
      icon: AlertTriangle,
    },
    suspended: {
      label: "Gestopt",
      cls: "bg-destructive/15 text-destructive",
      icon: AlertTriangle,
    },
    legacy: {
      label: "Handmatige facturatie",
      cls: "bg-muted text-muted-foreground",
      icon: CreditCard,
    },
  };
  const c = cfg[state];
  const Icon = c.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${c.cls}`}
    >
      <Icon className="size-3" />
      {c.label}
    </span>
  );
}

function StatusLine({
  state,
  trialEndsAt,
  currentPeriodEnd,
  paidUntil,
  lastPaymentFailedAt,
}: {
  state: State;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  paidUntil: Date | null;
  lastPaymentFailedAt: Date | null;
}) {
  if (state === "trial" || state === "trial-expiring") {
    return (
      <p className="mt-1 text-xs text-muted-foreground">
        Trial loopt tot{" "}
        {trialEndsAt && format(trialEndsAt, "d MMMM yyyy", { locale: nl })}
        . Daarna activeer je je abonnement om verder te kunnen.
      </p>
    );
  }
  if (state === "trial-expired") {
    return (
      <p className="mt-1 text-xs text-destructive">
        Je trial is afgelopen. Activeer je abonnement om weer items, klanten
        en boekingen toe te voegen.
      </p>
    );
  }
  if (state === "active") {
    return (
      <p className="mt-1 text-xs text-muted-foreground">
        Verlengt automatisch op{" "}
        {currentPeriodEnd
          ? format(currentPeriodEnd, "d MMMM yyyy", { locale: nl })
          : "binnenkort"}
        .
      </p>
    );
  }
  if (state === "active-canceling") {
    return (
      <p className="mt-1 text-xs text-[oklch(0.5_0.16_70)]">
        Stopt op{" "}
        {currentPeriodEnd
          ? format(currentPeriodEnd, "d MMMM yyyy", { locale: nl })
          : "periode-einde"}
        . Tot die tijd blijft alles werken zoals nu.
      </p>
    );
  }
  if (state === "past-due") {
    return (
      <p className="mt-1 text-xs text-destructive">
        Laatste betaling is mislukt
        {lastPaymentFailedAt && (
          <> op {format(lastPaymentFailedAt, "d MMM yyyy", { locale: nl })}</>
        )}
        . Mollie probeert nog enkele dagen — controleer je betaalmethode.
      </p>
    );
  }
  if (state === "suspended") {
    return (
      <p className="mt-1 text-xs text-destructive">
        Geen geldige betaling ontvangen. Je data blijft 30 dagen bewaard;
        herstart je abonnement om weer toegang te krijgen.
      </p>
    );
  }
  if (state === "legacy") {
    return (
      <p className="mt-1 text-xs text-muted-foreground">
        Handmatig betaald tot{" "}
        {paidUntil
          ? format(paidUntil, "d MMMM yyyy", { locale: nl })
          : "binnenkort"}
        . Activeer automatisch incasso om dit te vereenvoudigen.
      </p>
    );
  }
  return null;
}

function StateActions({
  state,
  mollieConfigured,
}: {
  state: State;
  mollieConfigured: boolean;
}) {
  if (
    state === "trial" ||
    state === "trial-expiring" ||
    state === "trial-expired" ||
    state === "suspended" ||
    state === "legacy"
  ) {
    return (
      <StartCheckoutButton
        label={
          state === "trial-expired"
            ? "Activeer abonnement"
            : state === "suspended"
              ? "Abonnement hervatten"
              : state === "legacy"
                ? "Stap over op automatisch incasso"
                : "Start abonnement"
        }
      />
    );
  }
  if (state === "active") {
    return <CancelSubscriptionButton />;
  }
  if (state === "active-canceling") {
    return <ResumeSubscriptionButton />;
  }
  if (state === "past-due") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          Mollie probeert de betaling nog enkele dagen. Lukt &lsquo;t niet, dan
          stopt &lsquo;t abonnement automatisch.
        </p>
        {mollieConfigured && (
          <StartCheckoutButton label="Nieuwe betaalmethode invoeren" />
        )}
      </div>
    );
  }
  return null;
}

// ── Cards / stats ───────────────────────────────────────────────────────

function Stat({
  label,
  current,
  max,
}: {
  label: string;
  current: number;
  max: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/50 p-3">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold tabular-nums">
        {current}
        <span className="text-xs font-normal text-muted-foreground">{" / "}{max}</span>
      </p>
    </div>
  );
}

function FeatureBadge({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-background/50 p-3">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-sm font-medium">
        {enabled ? (
          <>
            <span className="grid size-4 place-items-center rounded-full bg-[oklch(0.7_0.13_150)]/15 text-[oklch(0.5_0.14_150)]">
              <Check className="size-2.5" />
            </span>
            <span>Inbegrepen</span>
          </>
        ) : (
          <>
            <span className="grid size-4 place-items-center rounded-full bg-muted-foreground/20 text-muted-foreground">
              <X className="size-2.5" />
            </span>
            <span className="text-muted-foreground">Niet beschikbaar</span>
          </>
        )}
      </p>
    </div>
  );
}

function PlanCard({
  plan,
  current,
  pendingPlan,
  hasActiveSub,
  renewalDate,
  limits,
}: {
  plan: Plan;
  current: Plan;
  pendingPlan: Plan | null;
  hasActiveSub: boolean;
  renewalDate: Date | null;
  limits: ReturnType<typeof planLimits>;
}) {
  const isCurrent = plan === current;
  const isPending = plan === pendingPlan;
  const renewalLabel = renewalDate
    ? format(renewalDate, "d MMMM yyyy", { locale: nl })
    : "je volgende verlenging";
  return (
    <div
      className={`relative rounded-xl border p-5 ${
        isCurrent ? "border-primary/50 bg-primary/5" : "border-border bg-card"
      }`}
    >
      {isCurrent && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
          <Sparkles className="size-2.5" /> Huidig
        </span>
      )}
      {isPending && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-[oklch(0.94_0.08_70)] px-2 py-0.5 text-[10px] font-medium text-[oklch(0.5_0.16_70)]">
          <Clock className="size-2.5" /> Vanaf {renewalLabel}
        </span>
      )}
      <h3 className="text-base font-semibold tracking-tight">{limits.label}</h3>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tabular-nums">
          {limits.customPricing
            ? "Op aanvraag"
            : formatEuroNL(limits.monthlyPriceEuro)}
        </span>
        {!limits.customPricing && (
          <span className="text-xs text-muted-foreground">
            / maand incl. btw
          </span>
        )}
      </p>
      <ul className="mt-4 space-y-1.5 text-xs">
        <li className="flex items-center gap-2">
          <Check className="size-3 text-[oklch(0.5_0.14_150)]" />
          {Number.isFinite(limits.maxItems) ? `${limits.maxItems} items` : "Onbeperkte items"}
        </li>
        <li className="flex items-center gap-2">
          <Check className="size-3 text-[oklch(0.5_0.14_150)]" />
          {Number.isFinite(limits.maxMembers) ? `${limits.maxMembers} leden` : "Onbeperkte leden"}
        </li>
        {/* Boek-widget zit in élk plan — altijd groene check. */}
        <li className="flex items-center gap-2">
          <Check className="size-3 text-[oklch(0.5_0.14_150)]" />
          Boek-widget voor je eigen site
        </li>
        {/* Subdomein op bookingbay.nl zit ook in élk plan. */}
        <li className="flex items-center gap-2">
          <Check className="size-3 text-[oklch(0.5_0.14_150)]" />
          Klantsite op &lt;naam&gt;.bookingbay.nl
        </li>
        <li className="flex items-center gap-2">
          {limits.pageBuilder ? (
            <Check className="size-3 text-[oklch(0.5_0.14_150)]" />
          ) : (
            <X className="size-3 text-muted-foreground" />
          )}
          <span className={limits.pageBuilder ? "" : "text-muted-foreground"}>
            {!limits.pageBuilder
              ? "Geen site-builder"
              : limits.maxPages === 0
                ? "Site-builder — alleen je homepagina"
                : `Site-builder — homepagina + ${
                    Number.isFinite(limits.maxPages) ? limits.maxPages : "onbeperkt"
                  } extra pagina's`}
          </span>
        </li>
        <li className="flex items-center gap-2">
          {limits.customDomain ? (
            <Check className="size-3 text-[oklch(0.5_0.14_150)]" />
          ) : (
            <X className="size-3 text-muted-foreground" />
          )}
          <span className={limits.customDomain ? "" : "text-muted-foreground"}>
            Eigen domein (jouwbedrijf.nl)
          </span>
        </li>
        <li className="flex items-center gap-2">
          {!limits.alwaysShowPoweredBy ? (
            <Check className="size-3 text-[oklch(0.5_0.14_150)]" />
          ) : (
            <X className="size-3 text-muted-foreground" />
          )}
          <span className={!limits.alwaysShowPoweredBy ? "" : "text-muted-foreground"}>
            Verberg &quot;Powered by&quot;
          </span>
        </li>
        <li className="flex items-center gap-2">
          {limits.prioritySupport ? (
            <Check className="size-3 text-[oklch(0.5_0.14_150)]" />
          ) : (
            <X className="size-3 text-muted-foreground" />
          )}
          <span className={limits.prioritySupport ? "" : "text-muted-foreground"}>
            Prioriteit support
          </span>
        </li>
        {limits.dedicatedSupport && (
          <li className="flex items-center gap-2">
            <Check className="size-3 text-[oklch(0.5_0.14_150)]" />
            <span>Eigen account-manager + SLA</span>
          </li>
        )}
        {limits.sso && (
          <li className="flex items-center gap-2">
            <Check className="size-3 text-[oklch(0.5_0.14_150)]" />
            <span>SSO / SAML login</span>
          </li>
        )}
        {limits.whiteLabel && (
          <li className="flex items-center gap-2">
            <Check className="size-3 text-[oklch(0.5_0.14_150)]" />
            <span>Volledig white-label (incl. e-mail)</span>
          </li>
        )}
      </ul>
      {limits.customPricing && !isCurrent && (
        <a
          href="mailto:hallo@bookingbay.nl?subject=Enterprise%20BookingBay"
          className="mt-4 inline-flex h-9 items-center justify-center rounded-md border border-primary/40 bg-primary/5 px-3 text-xs font-medium text-primary hover:bg-primary/10"
        >
          Neem contact op
        </a>
      )}
      {!limits.customPricing && !isCurrent && !isPending && (
        <ChangePlanButton
          plan={plan}
          planLabel={limits.label}
          priceLabel={`${formatEuroNL(limits.monthlyPriceEuro)}/maand`}
          isUpgrade={PLAN_ORDER.indexOf(plan) > PLAN_ORDER.indexOf(current)}
          hasActiveSub={hasActiveSub}
          renewalLabel={renewalLabel}
        />
      )}
      {isPending && (
        <CancelScheduledPlanButton currentPlan={current} planLabel={limits.label} />
      )}
    </div>
  );
}
