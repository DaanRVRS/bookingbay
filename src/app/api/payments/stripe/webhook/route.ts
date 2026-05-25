import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit/log";
import { readPaymentConfig } from "@/lib/payments/config";
import { mapStripeStatus } from "@/lib/payments/tenant-stripe";
import { notifyPaymentStatusChange } from "@/lib/notifications/payment-notif";

export const dynamic = "force-dynamic";

/**
 * Stripe Checkout webhook. Stripe levert het event als raw JSON in de body
 * met een `Stripe-Signature` header. We parseren minimaal — alleen
 * `checkout.session.completed` en `checkout.session.expired` interesseren
 * ons. Verificatie van de handtekening is optioneel: als de tenant een
 * webhook-secret heeft ingesteld, valideren we; zo niet, accepteren we het
 * event op basis van de session-id (= URL-veilig random, niet te raden).
 */
export async function POST(req: Request) {
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let event: {
    type?: string;
    data?: { object?: { id?: string; payment_status?: string; status?: string } };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const sessionId = event.data?.object?.id ?? null;
  if (!sessionId) {
    return NextResponse.json({ ok: true });
  }

  const booking = await db.booking.findUnique({
    where: { paymentRef: sessionId },
    select: {
      id: true,
      organizationId: true,
      paymentProvider: true,
      paymentStatus: true,
      status: true,
    },
  });
  if (!booking || booking.paymentProvider !== "stripe") {
    console.warn("[stripe-webhook] onbekend session-id:", sessionId);
    return NextResponse.json({ ok: true });
  }

  // Optioneel: signature verifiëren als de tenant een secret heeft ingesteld.
  const cfg = await readPaymentConfig(booking.organizationId);
  if (cfg.stripeWebhookSecret) {
    const sig = req.headers.get("stripe-signature");
    if (!sig || !verifyStripeSignature(raw, sig, cfg.stripeWebhookSecret)) {
      console.warn("[stripe-webhook] signature-verify mislukt");
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  const paymentStatus = event.data?.object?.payment_status ?? "";
  const sessionStatus = event.data?.object?.status ?? "";
  const next = mapStripeStatus(paymentStatus, sessionStatus);

  const updates: { paymentStatus?: string; status?: "CONFIRMED" | "CANCELED" } = {};
  if (next !== booking.paymentStatus) updates.paymentStatus = next;
  if (next === "PAID" && booking.status === "PENDING") {
    updates.status = "CONFIRMED";
  } else if (next === "EXPIRED" && booking.status === "PENDING") {
    updates.status = "CANCELED";
  }

  if (Object.keys(updates).length > 0) {
    await db.booking.update({
      where: { id: booking.id },
      data: updates,
    });
    await audit({
      organizationId: booking.organizationId,
      action: "booking.payment.update",
      resource: "booking",
      resourceId: booking.id,
      metadata: { provider: "stripe", sessionId, status: next, eventType: event.type },
    });
    if (updates.paymentStatus) {
      await notifyPaymentStatusChange(booking.id, updates.paymentStatus, "stripe");
    }
  }

  return NextResponse.json({ ok: true });
}

/**
 * Verifieert de Stripe-signature header tegen het raw body + secret.
 * Gebaseerd op Stripe's officiële algoritme: header bevat `t=...,v1=...`
 * waarbij `v1` = HMAC-SHA256(secret, "t.body").
 */
function verifyStripeSignature(
  body: string,
  signatureHeader: string,
  secret: string,
): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createHmac, timingSafeEqual } = require("node:crypto") as typeof import("node:crypto");
    const parts = Object.fromEntries(
      signatureHeader.split(",").map((p) => {
        const [k, v] = p.split("=");
        return [k, v];
      }),
    ) as Record<string, string>;
    const t = parts.t;
    const v1 = parts.v1;
    if (!t || !v1) return false;
    const payload = `${t}.${body}`;
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(v1, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
