import "server-only";

/**
 * Stripe checkout-helpers voor tenant-bookings — gebruiken de tenant's
 * EIGEN secret key (sk_live_... of sk_test_...) via
 * Organization.paymentStripeKeyEnc.
 *
 * Net als bij Mollie: native fetch tegen Stripe's REST endpoints zonder
 * 'stripe' npm-package, anders trek je een hele zware bundle binnen.
 */

const STRIPE_API = "https://api.stripe.com/v1";

function formEncode(params: Record<string, string | number>): string {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) out.append(k, String(v));
  return out.toString();
}

interface StripeCheckoutSession {
  id: string;
  url: string | null;
  payment_intent: string | null;
  payment_status: string; // paid | unpaid | no_payment_required
  status: string; // complete | open | expired
  metadata?: { bookingId?: string };
}

export async function createStripeCheckoutForBooking(args: {
  apiKey: string;
  amountEuro: number;
  description: string;
  successUrl: string;
  cancelUrl: string;
  bookingId: string;
}): Promise<{ sessionId: string; checkoutUrl: string }> {
  const amountCents = Math.round(args.amountEuro * 100);
  const body = formEncode({
    mode: "payment",
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
    "line_items[0][quantity]": 1,
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": amountCents,
    "line_items[0][price_data][product_data][name]": args.description.slice(0, 250),
    "metadata[bookingId]": args.bookingId,
  });

  const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Stripe session-create ${res.status}: ${text.slice(0, 300)}`);
  }
  const session = (await res.json()) as StripeCheckoutSession;
  if (!session.url) {
    throw new Error("Stripe returned session without checkout URL");
  }
  return { sessionId: session.id, checkoutUrl: session.url };
}

export async function fetchStripeSession(args: {
  apiKey: string;
  sessionId: string;
}): Promise<StripeCheckoutSession> {
  const res = await fetch(`${STRIPE_API}/checkout/sessions/${args.sessionId}`, {
    headers: { Authorization: `Bearer ${args.apiKey}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Stripe session-fetch ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as StripeCheckoutSession;
}

export function mapStripeStatus(
  paymentStatus: string,
  sessionStatus: string,
): "PAID" | "EXPIRED" | "UNPAID" {
  if (paymentStatus === "paid" || paymentStatus === "no_payment_required") {
    return "PAID";
  }
  if (sessionStatus === "expired") return "EXPIRED";
  return "UNPAID";
}
