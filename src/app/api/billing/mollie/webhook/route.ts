import { NextResponse } from "next/server";
import type { Prisma, Plan } from "@prisma/client";
import { db } from "@/lib/db";
import { getPayment, paymentEventSnapshot, type MolliePayment } from "@/lib/billing/mollie";
import {
  onFirstPaymentPaid,
  onProrataUpgradeFailed,
  onRecurringFailed,
  onRecurringPaid,
  onSubscriptionCanceled,
} from "@/lib/billing/subscription";
import { createInvoiceForPayment } from "@/lib/billing/invoices";
import { planLimits } from "@/lib/plans";
import { COMPANY } from "@/lib/company";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mollie webhook receiver. Mollie stuurt application/x-www-form-urlencoded
 * met één veld `id` — de payment-id (tr_xxx) waarvoor er iets is gewijzigd.
 *
 * Voor recurring subscriptions: elk gemaakte charge is een payment, en
 * heeft `subscriptionId` op de payment-resource gevuld zodat we weten welke
 * subscription erbij hoort.
 *
 * Idempotent dankzij PaymentEvent.@@unique([externalId, eventType]).
 */
export async function POST(req: Request) {
  let paymentId: string;
  try {
    const body = await req.formData();
    paymentId = String(body.get("id") ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }
  if (!paymentId) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

  // Fetch payment to know its status, metadata, subscriptionId.
  let payment;
  try {
    payment = await getPayment(paymentId);
  } catch (err) {
    console.warn(
      `[mollie/webhook] getPayment ${paymentId} failed:`,
      err instanceof Error ? err.message : err,
    );
    // 200 returnen — anders blijft Mollie retries doen voor onbekende
    // payments (bijv. uit een ander Mollie-account / verkeerd doorgestuurd).
    return NextResponse.json({ ok: true });
  }

  const organizationId = payment.metadata?.organizationId;
  if (!organizationId) {
    // Geen idea welke org — payments die wij niet hebben aangemaakt.
    return NextResponse.json({ ok: true });
  }

  // Idempotency: maak een PaymentEvent rij. Bij conflict (al verwerkt)
  // skippen we de handlers. Payload is bewust een beperkte snapshot
  // (status/bedrag/id/methode) — geen consumentgegevens uit Mollie.
  const eventType = `payment.${payment.status}`;
  const amountCents = Math.round(parseFloat(payment.amount.value) * 100);
  try {
    await db.paymentEvent.create({
      data: {
        organizationId,
        externalId: paymentId,
        eventType,
        amountCents,
        subscriptionId: payment.subscriptionId ?? null,
        payload: paymentEventSnapshot(payment) as Prisma.InputJsonValue,
      },
    });
  } catch {
    // Unique-constraint hit → we hebben dit event al verwerkt.
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    // First-payment (handmatige checkout flow) vs. recurring charge.
    const kind = payment.metadata?.kind;
    if (payment.status === "paid") {
      if (kind === "checkout-first" || payment.sequenceType === "first") {
        await onFirstPaymentPaid({ organizationId, paymentId });
      } else if (payment.sequenceType === "recurring" && payment.subscriptionId) {
        await onRecurringPaid({
          organizationId,
          subscriptionId: payment.subscriptionId,
        });
      }
      // Factuur per geslaagde betaling (eerste, verlenging, pro-rata).
      await issueInvoice(organizationId, payment, amountCents);
    } else if (payment.status === "failed" || payment.status === "expired") {
      if (payment.metadata?.kind === "plan-upgrade-prorata" && payment.metadata?.prevPlan) {
        // Losse pro-rata plan-upgrade-charge gefaald → rol de direct-toegepaste
        // upgrade terug naar het vorige plan (anders gratis upgrade).
        await onProrataUpgradeFailed({
          organizationId,
          prevPlan: payment.metadata.prevPlan as Plan,
        });
      } else if (payment.sequenceType === "recurring" && payment.subscriptionId) {
        // Alleen subscription-charges mogen past_due triggeren.
        await onRecurringFailed({ organizationId });
      }
    } else if (payment.status === "canceled") {
      if (payment.sequenceType === "recurring" && payment.subscriptionId) {
        // Mollie cancelt de subscription wanneer alle retries op zijn.
        await onSubscriptionCanceled({ organizationId });
      }
    }
  } catch (err) {
    console.error(
      `[mollie/webhook] handler error for ${paymentId}:`,
      err instanceof Error ? err.message : err,
    );
    // KRITIEK: de side-effects zijn NIET (volledig) gelukt. Rol de
    // idempotency-claim terug en geef 500 zodat Mollie de webhook opnieuw
    // stuurt en de (idempotente) handler opnieuw kan draaien. Bleef de claim
    // staan én gaven we 200, dan werd elke retry als duplicate weggegooid —
    // dat is exact hoe een transiënte createSubscription-fout leidde tot
    // "geld geïnd, geen abonnement, klant later gesuspendeerd".
    await db.paymentEvent
      .deleteMany({ where: { organizationId, externalId: paymentId, eventType } })
      .catch(() => {});
    return NextResponse.json({ ok: false, error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * Bepaalt omschrijving en periode voor de factuur op basis van het soort
 * betaling en de (zojuist door de handler bijgewerkte) periode van de org.
 */
async function issueInvoice(
  organizationId: string,
  payment: MolliePayment,
  amountCents: number,
) {
  if (amountCents <= 0) return;
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { plan: true, currentPeriodEnd: true },
  });
  if (!org) return;

  const paidAt = payment.paidAt ? new Date(payment.paidAt) : new Date();
  const kind = payment.metadata?.kind;
  const planLabel = planLimits(org.plan).label;

  let periodStart: Date;
  let periodEnd: Date;
  let description: string;

  if (kind === "plan-upgrade-prorata") {
    periodStart = paidAt;
    periodEnd = org.currentPeriodEnd ?? paidAt;
    description = `${COMPANY.brand}-abonnement — upgrade naar ${planLabel} (pro-rata rest van de lopende periode)`;
  } else if (kind === "checkout-first" || payment.sequenceType === "first") {
    periodStart = paidAt;
    // onFirstPaymentPaid zet currentPeriodEnd op +30 dagen; als de mandate
    // nog pending is, is dat nog niet gebeurd — dan dezelfde 30 dagen.
    periodEnd =
      org.currentPeriodEnd && org.currentPeriodEnd > paidAt
        ? org.currentPeriodEnd
        : new Date(paidAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    description = `${COMPANY.brand}-abonnement ${planLabel} — eerste maand`;
  } else {
    // Verlenging: onRecurringPaid heeft currentPeriodEnd met een maand
    // verschoven; de gefactureerde periode is de maand daarvóór.
    periodEnd = org.currentPeriodEnd ?? paidAt;
    periodStart = new Date(periodEnd);
    periodStart.setUTCMonth(periodStart.getUTCMonth() - 1);
    description = `${COMPANY.brand}-abonnement ${planLabel} — maandelijkse verlenging`;
  }

  await createInvoiceForPayment({
    organizationId,
    paymentId: payment.id,
    grossCents: amountCents,
    description,
    periodStart,
    periodEnd,
    paymentMethod: payment.method ?? null,
    issuedAt: paidAt,
  });
}
