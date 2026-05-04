import { Check, Sparkles, X } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PLAN_LIMITS, planLimits, describeLimit } from "@/lib/plans";
import type { Plan } from "@prisma/client";

export const metadata = { title: "Plan & facturatie" };

const PLAN_ORDER: Plan[] = ["STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"];

export default async function BillingPage() {
  const ctx = await requireOrg();

  const org = await db.organization.findUnique({
    where: { id: ctx.organization.id },
    select: {
      id: true,
      plan: true,
      trialEndsAt: true,
      subscriptionStatus: true,
    },
  });
  if (!org) throw new Error("Organization missing");

  const [itemCount, memberCount] = await Promise.all([
    db.item.count({ where: { organizationId: org.id, isActive: true } }),
    db.membership.count({ where: { organizationId: org.id } }),
  ]);

  const current = planLimits(org.plan);
  const inTrial = org.trialEndsAt && org.trialEndsAt > new Date();

  return (
    <div className="flex flex-col gap-6">
      {/* Current plan summary */}
      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Huidig plan
            </p>
            <h2 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
              {current.label}
              {inTrial && (
                <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-medium text-primary">
                  Trial
                </span>
              )}
            </h2>
            {inTrial && org.trialEndsAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                Trial verloopt op {format(org.trialEndsAt, "d MMMM yyyy", { locale: nl })}
              </p>
            )}
          </div>
          <p className="text-right">
            <span className="text-2xl font-semibold tabular-nums">
              €{current.monthlyPriceEuro}
            </span>
            <span className="block text-xs text-muted-foreground">per maand</span>
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Items"
            current={itemCount}
            max={describeLimit(org.plan, "items")}
          />
          <Stat
            label="Leden"
            current={memberCount}
            max={describeLimit(org.plan, "members")}
          />
          <FeatureBadge label="Custom domain" enabled={current.customDomain} />
          <FeatureBadge label="API-toegang" enabled={current.apiAccess} />
        </div>
      </section>

      {/* Plan ladder */}
      <section>
        <h2 className="text-base font-semibold">Wissel van plan</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Mollie-betaalkoppeling volgt — voor nu kan een Eigenaar contact opnemen om handmatig
          te wisselen.
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {PLAN_ORDER.map((p) => (
            <PlanCard
              key={p}
              plan={p}
              current={org.plan}
              limits={PLAN_LIMITS[p]}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

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
  limits,
}: {
  plan: Plan;
  current: Plan;
  limits: ReturnType<typeof planLimits>;
}) {
  const isCurrent = plan === current;
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
      <h3 className="text-base font-semibold tracking-tight">{limits.label}</h3>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tabular-nums">
          {limits.monthlyPriceEuro === 0 ? "Custom" : `€${limits.monthlyPriceEuro}`}
        </span>
        {limits.monthlyPriceEuro > 0 && (
          <span className="text-xs text-muted-foreground">/ maand</span>
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
        <li className="flex items-center gap-2">
          {limits.customDomain ? (
            <Check className="size-3 text-[oklch(0.5_0.14_150)]" />
          ) : (
            <X className="size-3 text-muted-foreground" />
          )}
          <span className={limits.customDomain ? "" : "text-muted-foreground"}>
            Custom domain
          </span>
        </li>
        <li className="flex items-center gap-2">
          {limits.apiAccess ? (
            <Check className="size-3 text-[oklch(0.5_0.14_150)]" />
          ) : (
            <X className="size-3 text-muted-foreground" />
          )}
          <span className={limits.apiAccess ? "" : "text-muted-foreground"}>API-toegang</span>
        </li>
        <li className="flex items-center gap-2">
          {!limits.alwaysShowPoweredBy ? (
            <Check className="size-3 text-[oklch(0.5_0.14_150)]" />
          ) : (
            <X className="size-3 text-muted-foreground" />
          )}
          <span className={!limits.alwaysShowPoweredBy ? "" : "text-muted-foreground"}>
            Verberg "Powered by"
          </span>
        </li>
      </ul>
    </div>
  );
}
