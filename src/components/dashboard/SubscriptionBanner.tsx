import Link from "next/link";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { AlertTriangle, Clock, CreditCard } from "lucide-react";

/**
 * Top-of-dashboard banner die alleen verschijnt wanneer er iets is om naar
 * te kijken: betaling mislukt, abonnement loopt af, trial bijna voorbij,
 * service gesuspendeerd. Bij een gezonde 'active'-state laten we 'm leeg.
 */

interface Props {
  suspendedAt: Date | null;
  trialEndsAt: Date | null;
  subscriptionStatus: string | null;
  hasMollieSubscription: boolean;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  lastPaymentFailedAt: Date | null;
  paidUntil: Date | null;
}

export function SubscriptionBanner({
  suspendedAt,
  trialEndsAt,
  subscriptionStatus,
  hasMollieSubscription,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  lastPaymentFailedAt,
  paidUntil,
}: Props) {
  const now = new Date();

  if (suspendedAt) {
    return (
      <Bar tone="danger" icon={AlertTriangle}>
        <strong className="font-semibold">Abonnement gestopt</strong> — er is
        geen betaling ontvangen. Je data blijft 30 dagen bewaard.
        <CTA href="/dashboard/settings/billing" tone="danger">Hervatten</CTA>
      </Bar>
    );
  }

  if (subscriptionStatus === "past_due") {
    return (
      <Bar tone="danger" icon={AlertTriangle}>
        <strong className="font-semibold">Betaling mislukt</strong>
        {lastPaymentFailedAt && (
          <>
            {" "}
            op {format(lastPaymentFailedAt, "d MMM", { locale: nl })}
          </>
        )}
        . Mollie probeert opnieuw — controleer je betaalmethode om suspensie te voorkomen.
        <CTA href="/dashboard/settings/billing" tone="danger">Bekijk facturatie</CTA>
      </Bar>
    );
  }

  if (hasMollieSubscription && cancelAtPeriodEnd && currentPeriodEnd) {
    return (
      <Bar tone="warning" icon={Clock}>
        Je abonnement stopt op{" "}
        <strong>{format(currentPeriodEnd, "d MMMM", { locale: nl })}</strong>.
        Tot dan blijft alles werken zoals nu.
        <CTA href="/dashboard/settings/billing" tone="warning">Toch doorgaan</CTA>
      </Bar>
    );
  }

  // Trial-flow (geen Mollie sub aanwezig)
  if (!hasMollieSubscription && trialEndsAt) {
    const msLeft = trialEndsAt.getTime() - now.getTime();
    const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));

    if (msLeft <= 0) {
      return (
        <Bar tone="danger" icon={AlertTriangle}>
          <strong className="font-semibold">Trial afgelopen</strong> — activeer
          je abonnement om weer toe te voegen.
          <CTA href="/dashboard/settings/billing" tone="danger">Activeer</CTA>
        </Bar>
      );
    }
    if (daysLeft <= 3) {
      return (
        <Bar tone="warning" icon={Clock}>
          Je trial loopt af over{" "}
          <strong>{daysLeft === 1 ? "1 dag" : `${daysLeft} dagen`}</strong>{" "}
          ({format(trialEndsAt, "d MMM", { locale: nl })}). Activeer je
          abonnement om door te kunnen.
          <CTA href="/dashboard/settings/billing" tone="warning">Activeer</CTA>
        </Bar>
      );
    }
  }

  // Legacy paidUntil-flow (orgs van vóór de Mollie-migratie)
  if (!hasMollieSubscription && paidUntil) {
    const msLeft = paidUntil.getTime() - now.getTime();
    const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
    if (msLeft <= 0) {
      return (
        <Bar tone="warning" icon={Clock}>
          <strong className="font-semibold">Betaling te laat</strong> —
          verlengdatum was {format(paidUntil, "d MMMM", { locale: nl })}. Stap
          over op automatisch incasso om dit te voorkomen.
          <CTA href="/dashboard/settings/billing" tone="warning">Bekijk</CTA>
        </Bar>
      );
    }
    if (daysLeft <= 3) {
      return (
        <Bar tone="primary" icon={CreditCard}>
          Je betaalde periode loopt af op{" "}
          {format(paidUntil, "d MMMM", { locale: nl })}. Schakel automatisch
          incasso in om verlengingen niet te missen.
          <CTA href="/dashboard/settings/billing" tone="primary">Naar facturatie</CTA>
        </Bar>
      );
    }
  }

  return null;
}

// ── Layout helpers ──────────────────────────────────────────────────────

type Tone = "danger" | "warning" | "primary";

const TONE: Record<
  Tone,
  { border: string; bg: string; text: string; icon: string }
> = {
  danger: {
    border: "border-destructive/40",
    bg: "bg-destructive/10",
    text: "text-destructive",
    icon: "text-destructive",
  },
  warning: {
    border: "border-[oklch(0.85_0.13_85)]/50",
    bg: "bg-[oklch(0.97_0.05_80)]",
    text: "text-[oklch(0.4_0.13_70)]",
    icon: "text-[oklch(0.5_0.16_70)]",
  },
  primary: {
    border: "border-primary/30",
    bg: "bg-primary/8",
    text: "text-foreground",
    icon: "text-primary",
  },
};

function Bar({
  tone,
  icon: Icon,
  children,
}: {
  tone: Tone;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  const t = TONE[tone];
  return (
    <div className={`border-b ${t.border} ${t.bg} px-4 py-2.5 text-sm`}>
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <Icon className={`size-4 shrink-0 ${t.icon}`} />
        <p className={`flex flex-1 flex-wrap items-center gap-x-2 ${t.text}`}>
          {children}
        </p>
      </div>
    </div>
  );
}

function CTA({
  href,
  tone,
  children,
}: {
  href: string;
  tone: Tone;
  children: React.ReactNode;
}) {
  const styles: Record<Tone, string> = {
    danger: "bg-destructive text-destructive-foreground hover:opacity-90",
    warning: "bg-[oklch(0.6_0.16_70)] text-white hover:opacity-90",
    primary:
      "border border-primary/40 bg-background text-primary hover:bg-primary/10",
  };
  return (
    <Link
      href={href}
      className={`ml-auto shrink-0 rounded-md px-3 py-1.5 text-xs font-medium ${styles[tone]}`}
    >
      {children}
    </Link>
  );
}
