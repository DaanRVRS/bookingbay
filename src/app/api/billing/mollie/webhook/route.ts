import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getPayment } from "@/lib/billing/mollie";
import {
  onFirstPaymentPaid,
  onRecurringFailed,
  onRecurringPaid,
  onSubscriptionCanceled,
} from "@/lib/billing/subscription";

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
  // skippen we de handlers.
  const eventType = `payment.${payment.status}`;
  try {
    await db.paymentEvent.create({
      data: {
        organizationId,
        externalId: paymentId,
        eventType,
        amountCents: Math.round(parseFloat(payment.amount.value) * 100),
        subscriptionId: payment.subscriptionId ?? null,
        payload: payment as unknown as Prisma.InputJsonValue,
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
    } else if (payment.status === "failed" || payment.status === "expired") {
      if (payment.sequenceType === "recurring") {
        await onRecurringFailed({ organizationId });
      }
    } else if (payment.status === "canceled") {
      if (payment.sequenceType === "recurring") {
        // Mollie cancelt de subscription wanneer alle retries op zijn.
        await onSubscriptionCanceled({ organizationId });
      }
    }
  } catch (err) {
    console.warn(
      `[mollie/webhook] handler error for ${paymentId}:`,
      err instanceof Error ? err.message : err,
    );
    // Toch 200 → anders retried Mollie eindeloos.
  }

  return NextResponse.json({ ok: true });
}
