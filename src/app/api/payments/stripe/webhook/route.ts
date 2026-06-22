import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit/log";
import { readPaymentConfig } from "@/lib/payments/config";
import { fetchStripeSession, mapStripeStatus } from "@/lib/payments/tenant-stripe";
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
      totalPrice: true,
    },
  });
  if (!booking || booking.paymentProvider !== "stripe") {
    console.warn("[stripe-webhook] onbekend session-id:", sessionId);
    return NextResponse.json({ ok: true });
  }

  const cfg = await readPaymentConfig(booking.organizationId);
  // Signature verifiëren als de tenant een secret heeft ingesteld (met
  // replay-bescherming). Ook zónder secret vertrouwen we de body NIET — zie
  // de re-fetch hieronder.
  if (cfg.stripeWebhookSecret) {
    const sig = req.headers.get("stripe-signature");
    if (!sig || !verifyStripeSignature(raw, sig, cfg.stripeWebhookSecret)) {
      console.warn("[stripe-webhook] signature-verify mislukt");
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  // Vertrouw de event-body NIET (een ongetekende POST kon anders een boeking
  // gratis op "betaald" zetten). Haal de sessie opnieuw op via de tenant-key:
  // alleen de echte Stripe-account van de tenant kan die sessie ophalen.
  if (!cfg.stripeKey) {
    console.error("[stripe-webhook] geen stripe key voor org", booking.organizationId);
    return NextResponse.json({ ok: true });
  }
  let session;
  try {
    session = await fetchStripeSession({ apiKey: cfg.stripeKey, sessionId });
  } catch (err) {
    console.error("[stripe-webhook] session-fetch mislukt:", err);
    return NextResponse.json({ ok: true });
  }

  const next = mapStripeStatus(session.payment_status, session.status);

  // Bedrag-verificatie tegen de boeking — voorkomt bevestiging op een afwijkend
  // (gemanipuleerd of fout-geconfigureerd) bedrag.
  if (next === "PAID") {
    const paidCents =
      typeof session.amount_total === "number" ? session.amount_total : NaN;
    const expectedCents = Math.round(Number(booking.totalPrice) * 100);
    if (!Number.isFinite(paidCents) || paidCents !== expectedCents) {
      console.error(
        `[stripe-webhook] bedrag-mismatch booking ${booking.id}: ${paidCents} vs ${expectedCents}`,
      );
      return NextResponse.json({ ok: true });
    }
  }

  const updates: { paymentStatus?: string; status?: "CONFIRMED" | "CANCELED" } = {};
  if (next !== booking.paymentStatus) updates.paymentStatus = next;
  if (next === "PAID" && booking.status === "PENDING") {
    updates.status = "CONFIRMED";
  } else if (next === "EXPIRED" && booking.status === "PENDING") {
    updates.status = "CANCELED";
  }

  if (Object.keys(updates).length > 0) {
    // Optimistic lock op paymentStatus: voorkomt dubbele transitie/notif bij
    // gelijktijdige of herhaalde events.
    const res = await db.booking.updateMany({
      where: { id: booking.id, paymentStatus: booking.paymentStatus },
      data: updates,
    });
    if (res.count === 0) {
      return NextResponse.json({ ok: true });
    }
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
    // Replay-bescherming: weiger events buiten een tolerantie van 5 min
    // (Stripe's eigen lib doet hetzelfde).
    const tsSec = Number(t);
    if (!Number.isFinite(tsSec) || Math.abs(Date.now() / 1000 - tsSec) > 300) {
      return false;
    }
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
