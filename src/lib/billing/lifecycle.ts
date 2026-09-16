import "server-only";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit/log";
import { sendEmail, emailLayout, btn, EMAIL_ACCENT, escapeHtml } from "@/lib/email";
import { env } from "@/lib/env";
import { COMPANY, RETENTION } from "@/lib/company";
import { planLimits, formatEuroNL, exclVat } from "@/lib/plans";
import { notifyPaymentIssue } from "@/lib/discord/notifications";
import { computeMonthlyTotalCents } from "./subscription";
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
        Bedrag: <strong>${formatEuroNL(limits.monthlyPriceEuro)}</strong> per maand incl. btw
        (${formatEuroNL(exclVat(limits.monthlyPriceEuro))} excl. btw).
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
        <strong>Je gegevens blijven ${RETENTION.orgDeleteMonths} maanden beschikbaar.</strong>
        Wil je weer verder? Vul je betaalmethode aan en alles staat er weer —
        zonder verlies. Hervat je niet, dan verwijderen we de organisatie na
        die ${RETENTION.orgDeleteMonths} maanden automatisch; je krijgt
        ${RETENTION.orgDeleteWarnDays} dagen van tevoren een mail. Facturen
        bewaren we ${RETENTION.financeYears} jaar.
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
      <a href="mailto:${COMPANY.email}" style="color:${EMAIL_ACCENT}">Stuur ons een mail</a>
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
  // the grace window). Orgs met een Mollie-abonnement worden door de
  // SEPA-vooraankondiging (runSepaPrenotifications) en de webhook
  // afgehandeld — een verouderde paidUntil mag daar niet doorheen lopen.
  const cutoffPast = new Date(now.getTime() - (GRACE_DAYS + 30) * MS_PER_DAY);
  const cutoffFuture = new Date(now.getTime() + 5 * MS_PER_DAY);

  const orgs = await db.organization.findMany({
    where: {
      paidUntil: { not: null, gte: cutoffPast, lte: cutoffFuture },
      subscriptionId: null,
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
      await notifyPaymentIssue({
        orgId: org.id,
        orgName: org.name,
        stage:
          stage === 1
            ? "reminder-3d"
            : stage === 2
              ? "reminder-1d"
              : "reminder-today",
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
      subscriptionId: null,
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
    const daysOverdue = org.paidUntil
      ? Math.max(0, Math.floor((now.getTime() - org.paidUntil.getTime()) / MS_PER_DAY))
      : undefined;
    await notifyPaymentIssue({
      orgId: org.id,
      orgName: org.name,
      stage: "suspended",
      daysOverdue,
    });
    summary.suspended++;
  }

  return summary;
}

/* ============================================================ */
/* Mollie SaaS lifecycle — voor orgs met automatische incasso   */
/* ============================================================ */

export interface SaasLifecycleSummary {
  /** Orgs gesuspendeerd omdat de trial voorbij is + geen Mollie sub. */
  trialExpiredSuspended: number;
  /** Orgs gesuspendeerd omdat een Mollie sub al > GRACE_DAYS past_due staat. */
  pastDueSuspended: number;
  /** Orgs gesuspendeerd omdat 'n geanuleerde sub z'n periode-einde voorbij is. */
  canceledPeriodEndedSuspended: number;
  total: number;
}

/**
 * Idempotente pass die de Mollie-driven orgs door dezelfde grace-logica
 * haalt als de legacy paidUntil-flow:
 *
 *   1. Trial afgelopen >GRACE_DAYS én geen Mollie sub → suspend
 *   2. past_due >GRACE_DAYS → suspend (Mollie heeft alle retries opgegeven)
 *   3. cancelAtPeriodEnd + currentPeriodEnd voorbij → suspend
 *
 * Mailflow voor reminders zit nu nog in `runTrialChecks` (3d/1d/0d).
 * Past-due reminders versturen we elke ~3 dagen vanuit de webhook of
 * later vanuit een aparte dunning-loop; voor v1 alleen suspend.
 */
export async function runSaasLifecycleChecks(
  now: Date = new Date(),
): Promise<SaasLifecycleSummary> {
  const summary: SaasLifecycleSummary = {
    trialExpiredSuspended: 0,
    pastDueSuspended: 0,
    canceledPeriodEndedSuspended: 0,
    total: 0,
  };

  const graceCutoff = new Date(now.getTime() - GRACE_DAYS * MS_PER_DAY);

  // 1) Trial verlopen > GRACE_DAYS + geen Mollie sub + geen legacy paidUntil
  const trialExpired = await db.organization.findMany({
    where: {
      trialEndsAt: { lt: graceCutoff },
      subscriptionId: null,
      paidUntil: null,
      suspendedAt: null,
    },
    select: { id: true, name: true, plan: true, trialEndsAt: true },
  });
  for (const org of trialExpired) {
    await db.organization.update({
      where: { id: org.id },
      data: { suspendedAt: now },
    });
    await notifyRenewal(
      { ...org, slug: "", paidUntil: org.trialEndsAt ?? null },
      "expired",
    );
    await audit({
      organizationId: org.id,
      action: "org.trial.suspended",
      resource: "organization",
      resourceId: org.id,
      metadata: { trialEndsAt: org.trialEndsAt?.toISOString(), graceDays: GRACE_DAYS },
    });
    summary.trialExpiredSuspended++;
    summary.total++;
  }

  // 2) past_due > GRACE_DAYS → suspend.
  const pastDueOrgs = await db.organization.findMany({
    where: {
      subscriptionStatus: "past_due",
      lastPaymentFailedAt: { lt: graceCutoff },
      suspendedAt: null,
    },
    select: { id: true, name: true, plan: true, lastPaymentFailedAt: true },
  });
  for (const org of pastDueOrgs) {
    await db.organization.update({
      where: { id: org.id },
      data: { suspendedAt: now, subscriptionStatus: "suspended" },
    });
    await notifyRenewal(
      { ...org, slug: "", paidUntil: org.lastPaymentFailedAt },
      "expired",
    );
    await audit({
      organizationId: org.id,
      action: "org.subscription.suspended.past_due",
      resource: "organization",
      resourceId: org.id,
      metadata: {
        lastPaymentFailedAt: org.lastPaymentFailedAt?.toISOString(),
        graceDays: GRACE_DAYS,
      },
    });
    summary.pastDueSuspended++;
    summary.total++;
  }

  // 3) cancelAtPeriodEnd + currentPeriodEnd voorbij → suspend.
  const expiredCancels = await db.organization.findMany({
    where: {
      cancelAtPeriodEnd: true,
      currentPeriodEnd: { lt: now },
      suspendedAt: null,
    },
    select: { id: true, name: true, plan: true, currentPeriodEnd: true },
  });
  for (const org of expiredCancels) {
    await db.organization.update({
      where: { id: org.id },
      data: { suspendedAt: now, subscriptionStatus: "canceled" },
    });
    await audit({
      organizationId: org.id,
      action: "org.subscription.suspended.canceled",
      resource: "organization",
      resourceId: org.id,
      metadata: { currentPeriodEnd: org.currentPeriodEnd?.toISOString() },
    });
    summary.canceledPeriodEndedSuspended++;
    summary.total++;
  }

  return summary;
}

/* ============================================================ */
/* SEPA-vooraankondiging voor Mollie-abonnees                    */
/* ============================================================ */

export const PRENOTIFY_DAYS = 3;

export interface PrenotificationSummary {
  notified: number;
  total: number;
}

function renderPrenotificationEmail(args: {
  orgName: string;
  planLabel: string;
  totalCents: number;
  planCents: number;
  integrationsCents: number;
  chargeDate: Date;
  mandateId: string | null;
}) {
  const dateLabel = format(args.chargeDate, "EEEE d MMMM yyyy", { locale: nl });
  const total = formatEuroNL(args.totalCents / 100);
  const totalExcl = formatEuroNL(exclVat(args.totalCents / 100));
  const breakdown =
    args.integrationsCents > 0
      ? `${escapeHtml(args.planLabel)}-abonnement ${formatEuroNL(args.planCents / 100)} + koppelingen ${formatEuroNL(args.integrationsCents / 100)}`
      : `${escapeHtml(args.planLabel)}-abonnement`;
  return emailLayout(`
    <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600">Vooraankondiging automatische incasso</h1>
    <p>Hoi,</p>
    <p>
      Op <strong>${dateLabel}</strong> wordt <strong>${total}</strong>
      (incl. 21% btw; ${totalExcl} excl. btw) automatisch afgeschreven voor het
      ${COMPANY.brand}-abonnement van <strong>${escapeHtml(args.orgName)}</strong>
      (${breakdown}). De afschrijving loopt via Mollie op basis van de
      doorlopende machtiging die je bij het starten van je abonnement hebt
      gegeven${args.mandateId ? ` (kenmerk ${escapeHtml(args.mandateId)})` : ""}.
      Omschrijving op je afschrift: &ldquo;${COMPANY.brand}-abonnement&rdquo;.
    </p>
    <p>
      Wil je dit niet? Zeg dan vóór ${dateLabel} op via Instellingen → Plan &amp;
      facturatie; dan wordt er niets meer afgeschreven en blijft alles werken
      tot het einde van de lopende maand. Na de betaling vind je je factuur
      op dezelfde pagina.
    </p>
    <div style="margin:28px 0">
      ${btn(dashboardUrl(), "Naar Plan & facturatie")}
    </div>
    <p style="font-size:13px;color:#6b7280;margin-top:24px">
      Begunstigde: ${COMPANY.legalName}, KvK ${COMPANY.kvk}. Vragen?
      <a href="mailto:${COMPANY.email}" style="color:${EMAIL_ACCENT}">Stuur ons een mail</a>.
    </p>
  `);
}

/**
 * Stuurt Mollie-abonnees PRENOTIFY_DAYS dagen vóór de volgende afschrijving
 * een vooraankondiging (SEPA-regels: bedrag, datum, omschrijving, kenmerk).
 * Idempotent via paymentReminderStage: 0 = nog niet aangekondigd voor deze
 * periode; de webhook (onRecurringPaid/onFirstPaymentPaid) zet 'm terug op
 * 0 na elke geslaagde betaling, zodat de volgende maand opnieuw wordt
 * aangekondigd. Bij een geplande opzegging (cancelAtPeriodEnd) volgt geen
 * afschrijving en dus geen aankondiging.
 */
export async function runSepaPrenotifications(
  now: Date = new Date(),
): Promise<PrenotificationSummary> {
  const summary: PrenotificationSummary = { notified: 0, total: 0 };
  const windowEnd = new Date(now.getTime() + (PRENOTIFY_DAYS + 1) * MS_PER_DAY);

  const orgs = await db.organization.findMany({
    where: {
      subscriptionId: { not: null },
      subscriptionStatus: "active",
      cancelAtPeriodEnd: false,
      suspendedAt: null,
      paymentReminderStage: 0,
      currentPeriodEnd: { not: null, gte: startOfUtcDay(now), lte: windowEnd },
    },
    select: {
      id: true,
      name: true,
      plan: true,
      currentPeriodEnd: true,
      mollieMandateId: true,
    },
  });
  summary.total = orgs.length;

  for (const org of orgs) {
    if (!org.currentPeriodEnd) continue;
    if (daysUntil(org.currentPeriodEnd, now) > PRENOTIFY_DAYS) continue;

    const owners = await db.membership.findMany({
      where: { organizationId: org.id, role: { in: ["OWNER", "ADMIN"] } },
      select: { user: { select: { id: true, email: true } } },
      take: 10,
    });
    const recipients = owners
      .map((m) => m.user)
      .filter((u): u is { id: string; email: string } => Boolean(u?.email));
    if (recipients.length === 0) continue;

    const amounts = await computeMonthlyTotalCents(org.id);
    const html = renderPrenotificationEmail({
      orgName: org.name,
      planLabel: planLimits(org.plan).label,
      totalCents: amounts.totalCents,
      planCents: amounts.planCents,
      integrationsCents: amounts.integrationsCents,
      chargeDate: org.currentPeriodEnd,
      mandateId: org.mollieMandateId,
    });
    const dateShort = format(org.currentPeriodEnd, "d MMMM", { locale: nl });
    const subject = `Vooraankondiging: ${formatEuroNL(amounts.totalCents / 100)} wordt op ${dateShort} afgeschreven`;

    await Promise.all([
      ...recipients.map((u) => sendEmail({ to: u.email, subject, html })),
      db.notification.createMany({
        data: recipients.map((u) => ({
          userId: u.id,
          organizationId: org.id,
          type: "billing",
          title: `Incasso op ${dateShort}: ${formatEuroNL(amounts.totalCents / 100)}`,
          body: `Het maandbedrag voor je ${COMPANY.brand}-abonnement wordt automatisch afgeschreven. Opzeggen kan tot die datum.`,
          ctaUrl: "/dashboard/settings/billing",
          ctaLabel: "Naar facturatie",
        })),
      }),
    ]);

    await db.organization.update({
      where: { id: org.id },
      data: { paymentReminderStage: 1 },
    });
    await audit({
      organizationId: org.id,
      action: "billing.sepa.prenotified",
      resource: "organization",
      resourceId: org.id,
      metadata: {
        chargeDate: org.currentPeriodEnd.toISOString(),
        amountCents: amounts.totalCents,
      },
    });
    summary.notified++;
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
    data: { paymentReminderStage: 0, suspendedAt: null, deletionWarnedAt: null },
  });
}

/* ============================================================ */
/* Trial reminders (parallel logic, separate stage column)      */
/* ============================================================ */

interface TrialOrg {
  id: string;
  name: string;
  trialEndsAt: Date | null;
  plan: Plan;
}

function renderTrialEmail(
  org: TrialOrg,
  variant: "in-3-days" | "tomorrow" | "today" | "expired",
) {
  const limits = planLimits(org.plan);
  const dateLabel = org.trialEndsAt
    ? format(org.trialEndsAt, "EEEE d MMMM", { locale: nl })
    : "binnenkort";

  const headline = {
    "in-3-days": "Je trial loopt over 3 dagen af",
    tomorrow: "Je trial loopt morgen af",
    today: "Vandaag is de laatste dag van je trial",
    expired: "Je trial is afgelopen",
  }[variant];

  const body = {
    "in-3-days": `
      <p>Hoi,</p>
      <p>
        Je 14-daagse trial van <strong>${org.name}</strong> loopt af op
        <strong>${dateLabel}</strong>. Bevalt het? Kies een plan
        (vanaf ${formatEuroNL(limits.monthlyPriceEuro)} / mnd incl. btw) en je werkruimte gaat
        zonder onderbreking door.
      </p>
    `,
    tomorrow: `
      <p>Hoi,</p>
      <p>
        Korte heads-up: je trial loopt <strong>morgen</strong> af
        (${dateLabel}). Even kiezen of je doorgaat?
      </p>
    `,
    today: `
      <p>Hoi,</p>
      <p>
        Vandaag is de laatste dag van je trial. Kies vandaag nog een plan
        om <strong>${org.name}</strong> in de lucht te houden.
      </p>
    `,
    expired: `
      <p>Hoi,</p>
      <p>
        Je trial van <strong>${org.name}</strong> is afgelopen. Je data
        blijft bewaard — kies een plan om weer items, klanten en boekingen
        toe te voegen.
      </p>
    `,
  }[variant];

  return emailLayout(`
    <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600">${headline}</h1>
    ${body}
    <div style="margin:28px 0">
      ${btn(`${env.APP_URL}/dashboard/settings/billing`, "Kies een plan")}
    </div>
    <p style="font-size:13px;color:#6b7280;margin-top:24px">
      Vragen?
      <a href="mailto:${COMPANY.email}" style="color:${EMAIL_ACCENT}">Stuur ons een mail</a>
      — dan denken we mee.
    </p>
  `);
}

async function notifyTrialEnding(
  org: TrialOrg,
  variant: "in-3-days" | "tomorrow" | "today" | "expired",
) {
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
    "in-3-days": "Je trial loopt over 3 dagen af",
    tomorrow: "Trial-herinnering: morgen afgelopen",
    today: "Laatste dag van je trial",
    expired: "Je trial is afgelopen",
  }[variant];
  const bellTitle = {
    "in-3-days": "Trial loopt af over 3 dagen",
    tomorrow: "Trial loopt morgen af",
    today: "Vandaag laatste trial-dag",
    expired: "Trial afgelopen",
  }[variant];
  const bellBody = {
    "in-3-days": `Kies binnen 3 dagen een plan om ${org.name} door te laten draaien.`,
    tomorrow: "Morgen afgelopen — kies een plan om door te kunnen.",
    today: "Vandaag is de laatste dag — kies een plan om je werkruimte te behouden.",
    expired: "Je trial is voorbij. Kies een plan om weer items en boekingen toe te voegen.",
  }[variant];

  const html = renderTrialEmail(org, variant);

  await Promise.all([
    ...recipients.map((u) => sendEmail({ to: u.email, subject, html })),
    db.notification.createMany({
      data: recipients.map((u) => ({
        userId: u.id,
        organizationId: org.id,
        type: "billing",
        title: bellTitle,
        body: bellBody,
        ctaUrl: "/dashboard/settings/billing",
        ctaLabel: "Kies een plan",
      })),
    }),
  ]);
}

export interface TrialCheckSummary {
  reminded3Days: number;
  reminded1Day: number;
  remindedToday: number;
  remindedExpired: number;
  total: number;
}

/**
 * Trial-end reminder pass. Idempotent: trialReminderStage prevents
 * double-fire. Stage 4 is added so we can flag "expired" once after the
 * trial ran out (still no paidUntil).
 */
export async function runTrialChecks(
  now: Date = new Date(),
): Promise<TrialCheckSummary> {
  const summary: TrialCheckSummary = {
    reminded3Days: 0,
    reminded1Day: 0,
    remindedToday: 0,
    remindedExpired: 0,
    total: 0,
  };

  const cutoffPast = new Date(now.getTime() - 5 * MS_PER_DAY);
  const cutoffFuture = new Date(now.getTime() + 5 * MS_PER_DAY);

  const orgs = await db.organization.findMany({
    where: {
      trialEndsAt: { not: null, gte: cutoffPast, lte: cutoffFuture },
      paidUntil: null,
      suspendedAt: null,
    },
    select: {
      id: true,
      name: true,
      plan: true,
      trialEndsAt: true,
      trialReminderStage: true,
    },
  });

  summary.total = orgs.length;

  for (const org of orgs) {
    if (!org.trialEndsAt) continue;
    const stage = expectedStage(org.trialEndsAt, now);
    if (stage > org.trialReminderStage) {
      const variant =
        stage === 1 ? "in-3-days" : stage === 2 ? "tomorrow" : "today";
      await notifyTrialEnding(org, variant);
      await db.organization.update({
        where: { id: org.id },
        data: { trialReminderStage: stage },
      });
      await audit({
        organizationId: org.id,
        action: `org.trial.reminder.${variant}`,
        resource: "organization",
        resourceId: org.id,
        metadata: { trialEndsAt: org.trialEndsAt.toISOString() },
      });
      if (stage === 1) summary.reminded3Days++;
      else if (stage === 2) summary.reminded1Day++;
      else summary.remindedToday++;
    }
  }

  // Stage 4: trial ran out + still no paidUntil, fire once.
  const expiredCutoff = new Date(now.getTime() - 2 * MS_PER_DAY);
  const expiredOrgs = await db.organization.findMany({
    where: {
      trialEndsAt: { not: null, lt: now, gte: expiredCutoff },
      paidUntil: null,
      suspendedAt: null,
      trialReminderStage: { lt: 4 },
    },
    select: { id: true, name: true, plan: true, trialEndsAt: true },
  });
  for (const org of expiredOrgs) {
    await notifyTrialEnding(org, "expired");
    await db.organization.update({
      where: { id: org.id },
      data: { trialReminderStage: 4 },
    });
    await audit({
      organizationId: org.id,
      action: "org.trial.reminder.expired",
      resource: "organization",
      resourceId: org.id,
      metadata: { trialEndsAt: org.trialEndsAt?.toISOString() },
    });
    summary.remindedExpired++;
  }

  return summary;
}
