import "server-only";
import type { Plan } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { planLimits } from "@/lib/plans";
import { audit } from "@/lib/audit/log";
import {
  cancelSubscription as mollieCancel,
  createCustomer,
  createFirstPayment,
  createMandatePayment,
  createSubscription,
  getPayment,
  isMollieConfigured,
  listValidMandates,
  updateSubscriptionAmount,
} from "./mollie";

/**
 * High-level helpers voor de SaaS subscription-flow:
 *
 *   computeMonthlyTotalCents — plan + actieve koppelingen optellen.
 *   ensureMollieCustomer     — maak of haal Mollie-customer voor org.
 *   startFirstPayment        — start checkout (first-payment + mandate).
 *   onFirstPaymentPaid       — webhook → maakt subscription aan.
 *   onRecurringPaid          — webhook → bumpt currentPeriodEnd.
 *   onRecurringFailed        — webhook → mark past_due.
 *   onSubscriptionCanceled   — webhook → close out.
 *   markScheduledCancel      — gebruiker drukt "cancel".
 *   resumeSubscription       — gebruiker drukt "ongedaan maken" voor period-end.
 *   syncSubscriptionAmount   — koppeling-mutatie → update Mollie sub amount.
 */

const PRODUCT_DESCRIPTION = "BookingBay-abonnement";

function webhookUrl(): string {
  return `${env.APP_URL}/api/billing/mollie/webhook`;
}

function checkoutCallbackUrl(): string {
  return `${env.APP_URL}/api/billing/checkout/callback`;
}

export async function computeMonthlyTotalCents(
  organizationId: string,
  planOverride?: Plan,
): Promise<{ totalCents: number; planCents: number; integrationsCents: number }> {
  const [org, integrations] = await Promise.all([
    db.organization.findUnique({
      where: { id: organizationId },
      select: { plan: true },
    }),
    db.orgIntegration.findMany({
      where: { organizationId, status: "ACTIVE" },
      select: { monthlyPriceEuro: true },
    }),
  ]);
  if (!org) throw new Error("Organization missing");
  // Math.round zodat .99-prijzen (€24,99 → 2499 cent) zonder
  // floating-point drift in centen worden uitgedrukt.
  const planCents = Math.round(
    planLimits(planOverride ?? org.plan).monthlyPriceEuro * 100,
  );
  const integrationsCents = integrations.reduce(
    (sum, r) => sum + Math.round(r.monthlyPriceEuro * 100),
    0,
  );
  return {
    totalCents: planCents + integrationsCents,
    planCents,
    integrationsCents,
  };
}

async function ensureMollieCustomer(organizationId: string): Promise<string> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, mollieCustomerId: true },
  });
  if (!org) throw new Error("Organization missing");
  if (org.mollieCustomerId) return org.mollieCustomerId;

  // Pick a representative contact-email (eerste OWNER).
  const owner = await db.membership.findFirst({
    where: { organizationId, role: "OWNER" },
    select: { user: { select: { email: true, name: true } } },
  });
  const email = owner?.user?.email ?? `billing+${org.id}@bookingbay.nl`;
  const contactName = owner?.user?.name ?? org.name;

  const customer = await createCustomer({
    name: contactName,
    email,
    organizationId,
  });
  await db.organization.update({
    where: { id: organizationId },
    data: { mollieCustomerId: customer.id },
  });
  return customer.id;
}

/**
 * Start de checkout: maakt Mollie-customer aan (idempotent), opent een
 * 'first' payment ter waarde van de eerste maand (zelfde bedrag als
 * recurring) en returnt de Mollie checkout-URL waar de klant naar
 * geredirect moet worden.
 *
 * Mollie's first-payment IS de eerste echte betaling — bij succes wordt
 * dat zowel de mandate als de eerste betaalperiode. De subscription wordt
 * pas in de webhook aangemaakt zodat we zeker weten dat de mandate
 * geldig is.
 */
export async function startFirstPayment(args: {
  organizationId: string;
}): Promise<{ checkoutUrl: string; paymentId: string }> {
  if (!isMollieConfigured()) {
    throw new Error("Mollie niet geconfigureerd op deze server");
  }
  const customerId = await ensureMollieCustomer(args.organizationId);
  const { totalCents } = await computeMonthlyTotalCents(args.organizationId);
  if (totalCents <= 0) {
    throw new Error("Maandbedrag is 0 — niets om te chargen");
  }

  const payment = await createFirstPayment({
    customerId,
    amountCents: totalCents,
    description: PRODUCT_DESCRIPTION,
    redirectUrl: checkoutCallbackUrl(),
    webhookUrl: webhookUrl(),
    organizationId: args.organizationId,
  });

  if (!payment._links?.checkout?.href) {
    throw new Error("Mollie leverde geen checkout-URL");
  }

  await audit({
    organizationId: args.organizationId,
    action: "billing.checkout.start",
    resource: "organization",
    resourceId: args.organizationId,
    metadata: { paymentId: payment.id, amountCents: totalCents },
  });

  return {
    checkoutUrl: payment._links.checkout.href,
    paymentId: payment.id,
  };
}

/**
 * Webhook handler voor de eerste payment. Maakt op succes meteen een
 * recurring subscription aan zodat Mollie elke maand vanzelf doorgaat.
 * Idempotent — checkt de bestaande org-state.
 */
export async function onFirstPaymentPaid(args: {
  organizationId: string;
  paymentId: string;
}): Promise<void> {
  const payment = await getPayment(args.paymentId);
  if (payment.status !== "paid") {
    return; // We only act on confirmed paid.
  }
  const org = await db.organization.findUnique({
    where: { id: args.organizationId },
    select: {
      id: true,
      mollieCustomerId: true,
      subscriptionId: true,
      cancelAtPeriodEnd: true,
    },
  });
  if (!org?.mollieCustomerId) return;

  // Idempotency: als sub al bestaat, doe niks (kan happen bij webhook
  // retries).
  if (org.subscriptionId) {
    await db.organization.update({
      where: { id: org.id },
      data: {
        subscriptionStatus: "active",
        suspendedAt: null,
        lastPaymentFailedAt: null,
        cancelAtPeriodEnd: false,
      },
    });
    return;
  }

  // Pak de mandate die Mollie net heeft aangemaakt.
  const mandates = await listValidMandates(org.mollieCustomerId);
  const mandate = mandates[0];
  if (!mandate) {
    // Mandate is nog "pending" of niet aangemaakt — Mollie probeert
    // dit zelf binnen ~paar minuten af te ronden, dan vuren ze opnieuw.
    return;
  }

  // Subscription start MORGEN — vandaag is namelijk al betaald via de
  // first-payment, dus de eerste recurring charge volgt over precies
  // één maand.
  const startDate = new Date();
  startDate.setUTCDate(startDate.getUTCDate() + 30);
  const startDateIso = startDate.toISOString().slice(0, 10);

  const sub = await createSubscription({
    customerId: org.mollieCustomerId,
    amountCents: Math.round(parseFloat(payment.amount.value) * 100),
    description: PRODUCT_DESCRIPTION,
    webhookUrl: webhookUrl(),
    mandateId: mandate.id,
    organizationId: org.id,
    startDate: startDateIso,
  });

  // Initial currentPeriodEnd = first recurring charge moment.
  await db.organization.update({
    where: { id: org.id },
    data: {
      subscriptionId: sub.id,
      subscriptionStatus: "active",
      mollieMandateId: mandate.id,
      currentPeriodEnd: startDate,
      trialEndsAt: null,
      suspendedAt: null,
      lastPaymentFailedAt: null,
      cancelAtPeriodEnd: false,
      paymentReminderStage: 0,
    },
  });

  await audit({
    organizationId: org.id,
    action: "billing.subscription.created",
    resource: "organization",
    resourceId: org.id,
    metadata: {
      subscriptionId: sub.id,
      mandateId: mandate.id,
      amountCents: Math.round(parseFloat(payment.amount.value) * 100),
    },
  });
}

/**
 * Webhook handler voor elke recurring payment.paid. Bumpt currentPeriodEnd
 * met een maand zodat de UI weet wanneer de volgende charge komt.
 */
export async function onRecurringPaid(args: {
  organizationId: string;
  subscriptionId: string;
}): Promise<void> {
  const org = await db.organization.findUnique({
    where: { id: args.organizationId },
    select: {
      id: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      plan: true,
      pendingPlan: true,
    },
  });
  if (!org) return;

  const base = org.currentPeriodEnd ?? new Date();
  const next = new Date(base);
  next.setUTCMonth(next.getUTCMonth() + 1);

  await db.organization.update({
    where: { id: org.id },
    data: {
      subscriptionStatus: "active",
      currentPeriodEnd: next,
      lastPaymentFailedAt: null,
      suspendedAt: null,
      paymentReminderStage: 0,
      // Geplande downgrade gaat in op de verlenging: de charge die deze
      // webhook meldt is al tegen het (eerder gesyncte) nieuwe bedrag.
      ...(org.pendingPlan
        ? { plan: org.pendingPlan, pendingPlan: null }
        : {}),
    },
  });

  if (org.pendingPlan) {
    await audit({
      organizationId: org.id,
      action: "billing.plan.downgrade-applied",
      resource: "organization",
      resourceId: org.id,
      metadata: { from: org.plan, to: org.pendingPlan },
    });
  }
}

export async function onRecurringFailed(args: {
  organizationId: string;
}): Promise<void> {
  await db.organization.update({
    where: { id: args.organizationId },
    data: {
      subscriptionStatus: "past_due",
      lastPaymentFailedAt: new Date(),
    },
  });
}

/**
 * Mollie heeft de subscription gecanceld (door ons of door retry-uitputting).
 * Direct dichtzetten — de service was al actief tot currentPeriodEnd,
 * suspendedAt zetten we wanneer die datum gepasseerd is.
 */
export async function onSubscriptionCanceled(args: {
  organizationId: string;
}): Promise<void> {
  const org = await db.organization.findUnique({
    where: { id: args.organizationId },
    select: { id: true, currentPeriodEnd: true },
  });
  if (!org) return;

  const periodEnded = org.currentPeriodEnd
    ? org.currentPeriodEnd.getTime() <= Date.now()
    : true;

  await db.organization.update({
    where: { id: org.id },
    data: {
      subscriptionStatus: "canceled",
      cancelAtPeriodEnd: !periodEnded,
      suspendedAt: periodEnded ? new Date() : null,
    },
  });
}

/**
 * Gebruiker drukt "Cancel" op de billing-page. We zetten de cancellation
 * direct bij Mollie zodat er geen verlenging meer komt, maar service
 * loopt door tot currentPeriodEnd.
 */
export async function markScheduledCancel(organizationId: string): Promise<void> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, mollieCustomerId: true, subscriptionId: true },
  });
  if (!org?.mollieCustomerId || !org.subscriptionId) {
    throw new Error("Geen actieve subscription om te cancelen");
  }

  await mollieCancel({
    customerId: org.mollieCustomerId,
    subscriptionId: org.subscriptionId,
  });

  await db.organization.update({
    where: { id: org.id },
    data: { cancelAtPeriodEnd: true, subscriptionStatus: "canceled" },
  });

  await audit({
    organizationId: org.id,
    action: "billing.subscription.cancel-scheduled",
    resource: "organization",
    resourceId: org.id,
    metadata: { subscriptionId: org.subscriptionId },
  });
}

/**
 * Klant veranderde van gedachten — heractiveer voordat currentPeriodEnd
 * voorbij is. Maakt een NIEUWE subscription bij Mollie (de oude was al
 * geannuleerd) op de bestaande mandate.
 */
export async function resumeSubscription(organizationId: string): Promise<void> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      mollieCustomerId: true,
      mollieMandateId: true,
      currentPeriodEnd: true,
    },
  });
  if (!org?.mollieCustomerId || !org.mollieMandateId) {
    throw new Error("Geen mandate om te hervatten — start een nieuwe checkout");
  }
  if (!org.currentPeriodEnd || org.currentPeriodEnd.getTime() <= Date.now()) {
    throw new Error(
      "Betalingsperiode is al verstreken — start een nieuwe checkout om te hervatten",
    );
  }

  const { totalCents } = await computeMonthlyTotalCents(organizationId);
  const startDate = new Date(org.currentPeriodEnd);
  const sub = await createSubscription({
    customerId: org.mollieCustomerId,
    amountCents: totalCents,
    description: PRODUCT_DESCRIPTION,
    webhookUrl: webhookUrl(),
    mandateId: org.mollieMandateId,
    organizationId: org.id,
    startDate: startDate.toISOString().slice(0, 10),
  });

  await db.organization.update({
    where: { id: org.id },
    data: {
      subscriptionId: sub.id,
      subscriptionStatus: "active",
      cancelAtPeriodEnd: false,
    },
  });

  await audit({
    organizationId: org.id,
    action: "billing.subscription.resumed",
    resource: "organization",
    resourceId: org.id,
    metadata: { subscriptionId: sub.id },
  });
}

/**
 * Wordt aangeroepen wanneer een koppeling ACTIVE wordt of gepauzeerd —
 * herrekent het maandbedrag en update de Mollie subscription zodat de
 * volgende charge het nieuwe bedrag pakt. Best-effort: faalt 't bij
 * Mollie, dan loggen we maar gooien niet.
 */
export async function syncSubscriptionAmount(
  organizationId: string,
  planOverride?: Plan,
): Promise<void> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      mollieCustomerId: true,
      subscriptionId: true,
      subscriptionStatus: true,
    },
  });
  if (!org?.mollieCustomerId || !org.subscriptionId) return;
  if (org.subscriptionStatus !== "active") return;

  try {
    const { totalCents } = await computeMonthlyTotalCents(
      organizationId,
      planOverride,
    );
    if (totalCents <= 0) return;
    await updateSubscriptionAmount({
      customerId: org.mollieCustomerId,
      subscriptionId: org.subscriptionId,
      amountCents: totalCents,
      description: PRODUCT_DESCRIPTION,
    });
    await audit({
      organizationId: org.id,
      action: "billing.subscription.amount-updated",
      resource: "organization",
      resourceId: org.id,
      metadata: { newAmountCents: totalCents },
    });
  } catch (err) {
    console.warn(
      `[billing] subscription amount update mislukt voor org ${organizationId}:`,
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * Pro-rata verrekening bij een plan-upgrade halverwege de betaalperiode:
 * charge het prijsverschil × resterend deel van de periode direct op de
 * bestaande mandate. Zonder dit zou up-down-wisselen neerkomen op het
 * duurdere plan gebruiken tegen de goedkopere prijs.
 *
 * Retourneert het gecharchde bedrag in centen, of 0 wanneer er niets te
 * verrekenen viel (verschil verwaarloosbaar of periode-info onbekend).
 * Gooit bij een Mollie-fout — de caller besluit of de wissel doorgaat.
 */
export async function chargePlanUpgradeProrata(args: {
  organizationId: string;
  oldPlan: Plan;
  newPlan: Plan;
}): Promise<number> {
  const org = await db.organization.findUnique({
    where: { id: args.organizationId },
    select: {
      id: true,
      mollieCustomerId: true,
      mollieMandateId: true,
      subscriptionId: true,
      subscriptionStatus: true,
      currentPeriodEnd: true,
    },
  });
  if (
    !org?.mollieCustomerId ||
    !org.mollieMandateId ||
    !org.subscriptionId ||
    org.subscriptionStatus !== "active" ||
    !org.currentPeriodEnd
  ) {
    return 0; // Geen actieve betaalperiode → niets te verrekenen.
  }

  const diffCents =
    Math.round(planLimits(args.newPlan).monthlyPriceEuro * 100) -
    Math.round(planLimits(args.oldPlan).monthlyPriceEuro * 100);
  if (diffCents <= 0) return 0;

  // Resterend deel van de lopende periode (periode = 1 maand vóór
  // currentPeriodEnd tot currentPeriodEnd).
  const periodEnd = org.currentPeriodEnd.getTime();
  const periodStart = new Date(org.currentPeriodEnd);
  periodStart.setUTCMonth(periodStart.getUTCMonth() - 1);
  const totalMs = periodEnd - periodStart.getTime();
  const remainingMs = Math.min(Math.max(periodEnd - Date.now(), 0), totalMs);
  if (totalMs <= 0 || remainingMs <= 0) return 0;

  const chargeCents = Math.round((diffCents * remainingMs) / totalMs);
  // Onder de 50 cent niet chargen — transactiekosten > opbrengst.
  if (chargeCents < 50) return 0;

  const payment = await createMandatePayment({
    customerId: org.mollieCustomerId,
    mandateId: org.mollieMandateId,
    amountCents: chargeCents,
    description: `BookingBay plan-upgrade naar ${planLimits(args.newPlan).label} (pro-rata)`,
    webhookUrl: webhookUrl(),
    organizationId: org.id,
    kind: "plan-upgrade-prorata",
  });

  await audit({
    organizationId: org.id,
    action: "billing.plan.prorata-charged",
    resource: "organization",
    resourceId: org.id,
    metadata: {
      paymentId: payment.id,
      amountCents: chargeCents,
      from: args.oldPlan,
      to: args.newPlan,
    },
  });

  return chargeCents;
}
