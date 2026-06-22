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
      totalPrice: true,
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

  // Bedrag-verificatie: vertrouw niet blind dat "paid" voor het juiste bedrag
  // is. Bij mismatch niet auto-bevestigen — log zodat de eigenaar 't oppakt.
  if (next === "PAID") {
    const paid = payment.amount ? Number(payment.amount.value) : NaN;
    const expected = Number(booking.totalPrice);
    if (!Number.isFinite(paid) || Math.abs(paid - expected) > 0.01) {
      console.error(
        `[mollie-webhook] bedrag-mismatch booking ${booking.id}: betaald ${paid} vs verwacht ${expected}`,
      );
      return NextResponse.json({ ok: true });
    }
  }

  // Updates: alleen schrijven als er iets verandert.
  const updates: { paymentStatus?: string; status?: "CONFIRMED" | "CANCELED" } = {};
  if (next !== booking.paymentStatus) updates.paymentStatus = next;

  // Auto-bevestig bij PAID, auto-cancel bij EXPIRED/FAILED — alleen vanuit
  // PENDING zodat we tenant-handmatige overrides niet platwalsen.
  if (next === "PAID" && booking.status === "PENDING") {
    updates.status = "CONFIRMED";
  } else if (
    (next === "EXPIRED" || next === "FAILED") &&
    booking.status === "PENDING"
  ) {
    updates.status = "CANCELED";
  }

  if (Object.keys(updates).length > 0) {
    // Optimistic lock op paymentStatus: bij gelijktijdige webhooks (Mollie
    // stuurt er vaak meerdere) doet alleen de eerste de transitie + notif.
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
      metadata: { provider: "mollie", paymentId, status: next },
    });
    if (updates.paymentStatus) {
      await notifyPaymentStatusChange(booking.id, updates.paymentStatus, "mollie");
    }
  }

  return NextResponse.json({ ok: true });
}
