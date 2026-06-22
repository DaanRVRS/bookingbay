import "server-only";

/**
 * Mollie checkout-helpers voor tenant-bookings — gebruiken de tenant's
 * EIGEN API-key (via Organization.paymentMollieKeyEnc), geen platform-key.
 *
 * Geen externe lib in de bundle, alleen native fetch tegen de Mollie REST
 * API v2.
 */

const MOLLIE_API = "https://api.mollie.com/v2";

interface MolliePayment {
  id: string;
  status: string; // open | pending | authorized | expired | failed | canceled | paid
  amount?: { currency: string; value: string } | null;
  metadata?: { bookingId?: string } | null;
  _links?: { checkout?: { href: string } | null };
}

export async function createMolliePaymentForBooking(args: {
  apiKey: string;
  amountEuro: number;
  description: string;
  redirectUrl: string;
  webhookUrl: string;
  bookingId: string;
}): Promise<{ paymentId: string; checkoutUrl: string }> {
  const body = {
    amount: {
      currency: "EUR",
      value: args.amountEuro.toFixed(2),
    },
    description: args.description.slice(0, 255),
    redirectUrl: args.redirectUrl,
    webhookUrl: args.webhookUrl,
    metadata: { bookingId: args.bookingId },
  };

  const res = await fetch(`${MOLLIE_API}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mollie payment-create ${res.status}: ${text.slice(0, 300)}`);
  }
  const payment = (await res.json()) as MolliePayment;
  const checkout = payment._links?.checkout?.href;
  if (!checkout) {
    throw new Error("Mollie returned payment without checkout URL");
  }
  return { paymentId: payment.id, checkoutUrl: checkout };
}

export async function fetchMolliePayment(args: {
  apiKey: string;
  paymentId: string;
}): Promise<MolliePayment> {
  const res = await fetch(`${MOLLIE_API}/payments/${args.paymentId}`, {
    headers: { Authorization: `Bearer ${args.apiKey}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mollie payment-fetch ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as MolliePayment;
}

export function mapMollieStatus(
  status: string,
): "PAID" | "EXPIRED" | "UNPAID" | "FAILED" {
  if (status === "paid" || status === "authorized") return "PAID";
  // "failed"/"canceled" = de klant betaalde niet (≠ verlopen) — apart zodat de
  // tenant een correcte "mislukt"-notif krijgt i.p.v. "verlopen".
  if (status === "failed" || status === "canceled") return "FAILED";
  if (status === "expired") return "EXPIRED";
  return "UNPAID";
}
