import "server-only";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit/log";
import { sendEmail, emailLayout, btn } from "@/lib/email";
import { env } from "@/lib/env";
import { planLimits } from "@/lib/plans";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { Plan } from "@prisma/client";

/**
 * Days before paidUntil that we send reminders.
 *  - 3 days: stage 1 — "renewal in 3 days"
 *  - 1 day:  stage 2 — "renewal tomorrow"
 *  - 0 days: stage 3 — "due today"
 *
 * Once paidUntil is more than GRACE_DAYS in the past, the org is
 * suspended automatically.
 */
export const REMINDER_DAYS = [3, 1, 0] as const;
export const GRACE_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function startOfUtcDay(d: Date) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export function daysUntil(paidUntil: Date, ref: Date) {
  const a = startOfUtcDay(paidUntil).getTime();
  const b = startOfUtcDay(ref).getTime();
  return Math.round((a - b) / MS_PER_DAY);
}

/** Determine which reminder stage the org should be at, based on paidUntil. */
export function expectedStage(paidUntil: Date, ref: Date): 0 | 1 | 2 | 3 {
  const d = daysUntil(paidUntil, ref);
  if (d <= 0) return 3;
  if (d <= 1) return 2;
  if (d <= 3) return 1;
  return 0;
}

/* -------------------- Email templates -------------------- */

interface RecipientOrg {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  paidUntil: Date | null;
}

function dashboardUrl() {
  return `${env.APP_URL}/dashboard/settings/billing`;
}

function renderRenewalEmail(
  org: RecipientOrg,
  variant: "in-3-days" | "tomorrow" | "today" | "expired",
) {
  const limits = planLimits(org.plan);
  const dateLabel = org.paidUntil
    ? format(org.paidUntil, "EEEE d MMMM", { locale: nl })
    : "binnenkort";

  const headline = {
    "in-3-days": `Je BookingBay-abonnement verlengt over 3 dagen`,
    tomorrow: `Je BookingBay-abonnement verlengt morgen`,
    today: `Je BookingBay-abonnement verlengt vandaag`,
    expired: `Je BookingBay-abonnement is verlopen`,
  }[variant];

  const body = {
    "in-3-days": `
      <p>Hoi,</p>
      <p>
        Je <strong>${limits.label}</strong>-abonnement voor
        <strong>${org.name}</strong> loopt af op <strong>${dateLabel}</strong>.
        Bij BookingBay betaal je vooraf voor de komende periode — zorg dus dat
        je betaalmethode op orde is voor die datum.
      </p>
      <p>
        Bedrag: <strong>€${limits.monthlyPriceEuro}</strong> per maand.
      </p>
    `,
    tomorrow: `
      <p>Hoi,</p>
      <p>
        Korte herinnering: je <strong>${limits.label}</strong>-abonnement voor
        <strong>${org.name}</strong> verlengt <strong>morgen</strong>
        (${dateLabel}).
      </p>
      <p>
        Mocht je willen wijzigen of opzeggen, dan is dit het moment.
      </p>
    `,
    today: `
      <p>Hoi,</p>
      <p>
        Vandaag is de verlengdatum van je BookingBay-abonnement voor
        <strong>${org.name}</strong>. Geen actie nodig als je betaalmethode
        klopt — anders krijg je de komende dagen nog automatische pogingen.
      </p>
      <p>
        Lukt het binnen ${GRACE_DAYS} dagen niet, dan stopt het abonnement
        automatisch.
      </p>
    `,
    expired: `
      <p>Hoi,</p>
      <p>
        We hebben de afgelopen dagen meerdere keren geprobeerd je
        BookingBay-abonnement voor <strong>${org.name}</strong> te verlengen,
        maar de betaling is niet binnengekomen. Daarom is het abonnement nu
        automatisch gestopt.
      </p>
      <p>
        <strong>Je data blijft 30 dagen bewaard.</strong> Wil je weer
        verder? Vul je betaalmethode aan en alles staat er weer — zonder
        verlies.
      </p>
    `,
  }[variant];

  return emailLayout(`
    <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600">${headline}</h1>
    ${body}
    <div style="margin:28px 0">
      ${btn(dashboardUrl(), variant === "expired" ? "Abonnement hervatten" : "Naar facturatie")}
    </div>
    <p style="font-size:13px;color:#6b7280;margin-top:24px">
      Vragen?
      <a href="mailto:hallo@bookingbay.nl" style="color:#ef5934">Stuur ons een mail</a>
      — dan denken we mee.
    </p>
  `);
}

async function notifyRenewal(
  org: RecipientOrg,
  variant: "in-3-days" | "tomorrow" | "today" | "expired",
) {
  // Pull owner+admin user records (we need both id for in-app notifications
  // and email for transactional mail).
  const owners = await db.membership.findMany({
    where: { organizationId: org.id, role: { in: ["OWNER", "ADMIN"] } },
    select: { user: { select: { id: true, email: true } } },
    take: 10,
  });
  const recipients = owners
    .map((m) => m.user)
    .filter((u): u is { id: string; email: string } => Boolean(u?.email));
  if (recipients.length === 0) return;

  const subject = {
    "in-3-days": `Je BookingBay-abonnement verlengt over 3 dagen`,
    tomorrow: `Herinnering: verlenging morgen`,
    today: `Verlengdatum: vandaag`,
    expired: `Je BookingBay-abonnement is verlopen`,
  }[variant];

  const bellTitle = {
    "in-3-days": "Verlenging over 3 dagen",
    tomorrow: "Verlenging morgen",
    today: "Vandaag verlengt je abonnement",
    expired: "Je abonnement is verlopen",
  }[variant];

  const bellBody = {
    "in-3-days":
      "Zorg dat je betaalmethode klopt — je abonnement verlengt over 3 dagen.",
    tomorrow:
      "Korte heads-up: morgen verlengt je BookingBay-abonnement.",
    today:
      "Vandaag is de verlengdatum. Geen actie nodig als je betaalmethode klopt.",
    expired:
      "We konden de betaling niet verwerken — je abonnement is gestopt. Vul je betaalmethode aan om te hervatten.",
  }[variant];

  const html = renderRenewalEmail(org, variant);

  // Run e-mail + in-app notifications in parallel. Per-recipient errors
  // are swallowed by sendEmail/createMany so one failure won't take down
  // the whole batch.
  await Promise.all([
    ...recipients.map((u) =>
      sendEmail({ to: u.email, subject, html }),
    ),
    db.notification.createMany({
      data: recipients.map((u) => ({
        userId: u.id,
        organizationId: org.id,
        type: "billing",
        title: bellTitle,
        body: bellBody,
        ctaUrl: "/dashboard/settings/billing",
        ctaLabel:
          variant === "expired" ? "Abonnement hervatten" : "Naar facturatie",
      })),
    }),
  ]);
}

/* -------------------- Cron driver -------------------- */

export interface BillingCheckSummary {
  reminded3Days: number;
  reminded1Day: number;
  remindedToday: number;
  suspended: number;
  total: number;
}

/**
 * Daily lifecycle pass. Idempotent: re-running on the same day for the
 * same org won't re-send emails (paymentReminderStage is monotonically
 * non-decreasing while paidUntil stays the same).
 */
export async function runBillingChecks(now: Date = new Date()): Promise<BillingCheckSummary> {
  const summary: BillingCheckSummary = {
    reminded3Days: 0,
    reminded1Day: 0,
    remindedToday: 0,
    suspended: 0,
    total: 0,
  };

  // Find every org with a tracked paid period that is not already
  // suspended, including ones whose paidUntil is in the past (within
  // the grace window).
  const cutoffPast = new Date(now.getTime() - (GRACE_DAYS + 30) * MS_PER_DAY);
  const cutoffFuture = new Date(now.getTime() + 5 * MS_PER_DAY);

  const orgs = await db.organization.findMany({
    where: {
      paidUntil: { not: null, gte: cutoffPast, lte: cutoffFuture },
      suspendedAt: null,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      paidUntil: true,
      paymentReminderStage: true,
    },
  });

  summary.total = orgs.length;

  for (const org of orgs) {
    if (!org.paidUntil) continue;
    const stage = expectedStage(org.paidUntil, now);
    if (stage > org.paymentReminderStage) {
      // Move the stage forward and send the corresponding email.
      const variant =
        stage === 1 ? "in-3-days" : stage === 2 ? "tomorrow" : "today";
      await notifyRenewal(org, variant);
      await db.organization.update({
        where: { id: org.id },
        data: { paymentReminderStage: stage },
      });
      await audit({
        organizationId: org.id,
        action: `org.payment.reminder.${variant}`,
        resource: "organization",
        resourceId: org.id,
        metadata: { paidUntil: org.paidUntil.toISOString() },
      });
      if (stage === 1) summary.reminded3Days++;
      else if (stage === 2) summary.reminded1Day++;
      else summary.remindedToday++;
    }
  }

  // Suspension pass — paidUntil > GRACE_DAYS in the past.
  const suspendCutoff = new Date(now.getTime() - GRACE_DAYS * MS_PER_DAY);
  const toSuspend = await db.organization.findMany({
    where: {
      paidUntil: { lt: suspendCutoff },
      suspendedAt: null,
    },
    select: { id: true, name: true, slug: true, plan: true, paidUntil: true },
  });

  for (const org of toSuspend) {
    await db.organization.update({
      where: { id: org.id },
      data: { suspendedAt: now },
    });
    await notifyRenewal(org, "expired");
    await audit({
      organizationId: org.id,
      action: "org.subscription.suspended",
      resource: "organization",
      resourceId: org.id,
      metadata: {
        paidUntil: org.paidUntil?.toISOString(),
        graceDays: GRACE_DAYS,
      },
    });
    summary.suspended++;
  }

  return summary;
}

/**
 * Called from admin actions when paidUntil is set/extended manually.
 * Resets the reminder stage and clears any existing suspension so the
 * normal lifecycle takes over again.
 */
export async function onPaidUntilChanged(organizationId: string) {
  await db.organization.update({
    where: { id: organizationId },
    data: { paymentReminderStage: 0, suspendedAt: null },
  });
}
