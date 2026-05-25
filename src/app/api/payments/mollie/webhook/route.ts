import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit/log";
import { readPaymentConfig } from "@/lib/payments/config";
import { fetchMolliePayment, mapMollieStatus } from "@/lib/payments/tenant-mollie";
import { notifyPaymentStatusChange } from "@/lib/notifications/payment-notif";

export const dynamic = "force-dynamic";

/**
 * Mollie POST't deze endpoint na elke status-wijziging van een payment. Body
 * is x-www-form-urlencoded: `id=tr_xxx`. Wij vragen daarna zelf de payment
 * op via de tenant's API-key (= zekerheid dat het geen spoof is — alleen
 * de tenant's account heeft toegang tot de payment-id).
 */
export async function POST(req: Request) {
  let paymentId: string | null = null;
  try {
    const text = await req.text();
    const params = new URLSearchParams(text);
    paymentId = params.get("id");
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!paymentId) {
    return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
  }

  // Zoek de boeking via paymentRef (provider-onafhankelijk uniek).
  const booking = await db.booking.findUnique({
    where: { paymentRef: paymentId },
    select: {
      id: true,
      organizationId: true,
      paymentProvider: true,
      paymentStatus: true,
      status: true,
    },
  });
  if (!booking || booking.paymentProvider !== "mollie") {
    // Niet bekend in onze DB — Mollie verwacht 200 zodat 'ie niet gaat
    // retryen, maar we willen wel een log-trace hebben.
    console.warn("[mollie-webhook] onbekend payment-id:", paymentId);
    return NextResponse.json({ ok: true });
  }

  const cfg = await readPaymentConfig(booking.organizationId);
  if (!cfg.mollieKey) {
    console.error(
      "[mollie-webhook] tenant heeft geen mollie key meer voor org",
      booking.organizationId,
    );
    return NextResponse.json({ ok: true });
  }

  let payment;
  try {
    payment = await fetchMolliePayment({
      apiKey: cfg.mollieKey,
      paymentId,
    });
  } catch (err) {
    console.error("[mollie-webhook] fetch mislukt:", err);
    // 200 terug zodat Mollie niet hammert; we handlen het later (cron of
    // handmatig) als nodig.
    return NextResponse.json({ ok: true });
  }

  const next = mapMollieStatus(payment.status);

  // Updates: alleen schrijven als er iets verandert.
  const updates: { paymentStatus?: string; status?: "CONFIRMED" | "CANCELED" } = {};
  if (next !== booking.paymentStatus) updates.paymentStatus = next;

  // Auto-bevestig bij PAID, auto-cancel bij EXPIRED — alleen vanuit PENDING
  // zodat we tenant-handmatige overrides niet platwalsen.
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
      metadata: { provider: "mollie", paymentId, status: next },
    });
    // Alleen wanneer paymentStatus daadwerkelijk transitioneerde (zit in
    // updates) een notif sturen — anders zou elke webhook-retry een ping
    // genereren.
    if (updates.paymentStatus) {
      await notifyPaymentStatusChange(booking.id, updates.paymentStatus, "mollie");
    }
  }

  return NextResponse.json({ ok: true });
}
