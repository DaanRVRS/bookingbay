import "server-only";
import { env } from "@/lib/env";

/**
 * Minimal Mollie API v2 client — geen mollie-api-node lib mee in de bundle,
 * we praten direct tegen hun REST endpoints. Alleen de calls die we echt
 * gebruiken: customers, payments (first-payment voor mandate), subscriptions.
 *
 * Mollie's `amount` is altijd { value: "12.00", currency: "EUR" } met value
 * als string met exact 2 decimalen. We werken intern in cents (int) en
 * converteren op de grens.
 */

const MOLLIE_API = "https://api.mollie.com/v2";

export function isMollieConfigured(): boolean {
  return Boolean(env.MOLLIE_API_KEY);
}

function authHeaders(): HeadersInit {
  if (!env.MOLLIE_API_KEY) {
    throw new Error("MOLLIE_API_KEY niet gezet");
  }
  return {
    Authorization: `Bearer ${env.MOLLIE_API_KEY}`,
    "Content-Type": "application/json",
  };
}

async function molliePost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${MOLLIE_API}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mollie POST ${path} ${res.status}: ${text.slice(0, 400)}`);
  }
  return (await res.json()) as T;
}

async function molliePatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${MOLLIE_API}${path}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mollie PATCH ${path} ${res.status}: ${text.slice(0, 400)}`);
  }
  return (await res.json()) as T;
}

async function mollieGet<T>(path: string): Promise<T> {
  const res = await fetch(`${MOLLIE_API}${path}`, {
    method: "GET",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mollie GET ${path} ${res.status}: ${text.slice(0, 400)}`);
  }
  return (await res.json()) as T;
}

async function mollieDelete(path: string): Promise<void> {
  const res = await fetch(`${MOLLIE_API}${path}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mollie DELETE ${path} ${res.status}: ${text.slice(0, 400)}`);
  }
}

// ── Money helpers ────────────────────────────────────────────────────────

export interface MollieAmount {
  currency: string;
  value: string;
}

export function toMollieAmount(cents: number, currency = "EUR"): MollieAmount {
  // Mollie wil exact 2 decimalen voor EUR, USD etc.
  return { value: (cents / 100).toFixed(2), currency };
}

export function fromMollieAmount(amount: MollieAmount | undefined): number {
  if (!amount?.value) return 0;
  return Math.round(parseFloat(amount.value) * 100);
}

// ── Customers ────────────────────────────────────────────────────────────

export interface MollieCustomer {
  id: string;
  name?: string;
  email?: string;
  metadata?: Record<string, string>;
}

export function createCustomer(args: {
  name: string;
  email: string;
  organizationId: string;
}): Promise<MollieCustomer> {
  return molliePost<MollieCustomer>("/customers", {
    name: args.name,
    email: args.email,
    metadata: { organizationId: args.organizationId },
  });
}

// ── First-payment (creates mandate) ──────────────────────────────────────

export interface MolliePayment {
  id: string;
  status: string;
  amount: MollieAmount;
  customerId?: string;
  mandateId?: string;
  subscriptionId?: string;
  description?: string;
  metadata?: Record<string, string>;
  sequenceType?: "oneoff" | "first" | "recurring";
  _links?: {
    checkout?: { href: string };
  };
}

/**
 * Creëer een 'first' payment voor de klant — Mollie redirect 'm naar checkout
 * waar 'ie iDEAL / kaart kiest. Bij success krijgt de klant een mandate dat
 * we voor recurring kunnen gebruiken.
 */
export function createFirstPayment(args: {
  customerId: string;
  amountCents: number;
  description: string;
  redirectUrl: string;
  webhookUrl: string;
  organizationId: string;
}): Promise<MolliePayment> {
  return molliePost<MolliePayment>("/payments", {
    amount: toMollieAmount(args.amountCents),
    description: args.description,
    customerId: args.customerId,
    sequenceType: "first",
    redirectUrl: args.redirectUrl,
    webhookUrl: args.webhookUrl,
    metadata: {
      organizationId: args.organizationId,
      kind: "checkout-first",
    },
  });
}

export function getPayment(paymentId: string): Promise<MolliePayment> {
  return mollieGet<MolliePayment>(`/payments/${paymentId}`);
}

/**
 * Eenmalige charge op een bestaande mandate (sequenceType "recurring"
 * zónder subscription) — gebruikt voor pro-rata verrekening bij een
 * plan-upgrade halverwege de betaalperiode. `kind` gaat mee in metadata
 * zodat de webhook 'm kan onderscheiden van subscription-charges.
 */
export function createMandatePayment(args: {
  customerId: string;
  mandateId: string;
  amountCents: number;
  description: string;
  webhookUrl: string;
  organizationId: string;
  kind: string;
  /** Plan waarop de org stond vóór de upgrade — laat de webhook terugrollen
   *  als deze losse pro-rata-charge later faalt. */
  prevPlan?: string;
}): Promise<MolliePayment> {
  return molliePost<MolliePayment>("/payments", {
    amount: toMollieAmount(args.amountCents),
    description: args.description,
    customerId: args.customerId,
    mandateId: args.mandateId,
    sequenceType: "recurring",
    webhookUrl: args.webhookUrl,
    metadata: {
      organizationId: args.organizationId,
      kind: args.kind,
      ...(args.prevPlan ? { prevPlan: args.prevPlan } : {}),
    },
  });
}

// ── Mandates ─────────────────────────────────────────────────────────────

export interface MollieMandate {
  id: string;
  status: "valid" | "pending" | "invalid";
  method?: string;
}

export async function listValidMandates(
  customerId: string,
): Promise<MollieMandate[]> {
  const data = await mollieGet<{ _embedded?: { mandates?: MollieMandate[] } }>(
    `/customers/${customerId}/mandates?limit=50`,
  );
  return (data._embedded?.mandates ?? []).filter((m) => m.status === "valid");
}

// ── Subscriptions ────────────────────────────────────────────────────────

export interface MollieSubscription {
  id: string;
  status: "pending" | "active" | "canceled" | "suspended" | "completed";
  amount: MollieAmount;
  interval: string;
  nextPaymentDate?: string;
  startDate?: string;
  mandateId?: string;
  description?: string;
  metadata?: Record<string, string>;
}

/**
 * Maakt een recurring subscription voor de klant op een geldige mandate.
 * Mollie chargt automatisch elke `interval` (bv. "1 month") en stuurt
 * webhook bij elke charge.
 */
export function createSubscription(args: {
  customerId: string;
  amountCents: number;
  description: string;
  webhookUrl: string;
  mandateId?: string;
  organizationId: string;
  startDate?: string; // YYYY-MM-DD — Mollie chargt op deze datum eerst.
}): Promise<MollieSubscription> {
  return molliePost<MollieSubscription>(
    `/customers/${args.customerId}/subscriptions`,
    {
      amount: toMollieAmount(args.amountCents),
      interval: "1 month",
      description: args.description,
      webhookUrl: args.webhookUrl,
      ...(args.mandateId ? { mandateId: args.mandateId } : {}),
      ...(args.startDate ? { startDate: args.startDate } : {}),
      metadata: {
        organizationId: args.organizationId,
      },
    },
  );
}

export function updateSubscriptionAmount(args: {
  customerId: string;
  subscriptionId: string;
  amountCents: number;
  description?: string;
}): Promise<MollieSubscription> {
  return molliePatch<MollieSubscription>(
    `/customers/${args.customerId}/subscriptions/${args.subscriptionId}`,
    {
      amount: toMollieAmount(args.amountCents),
      ...(args.description ? { description: args.description } : {}),
    },
  );
}

export function cancelSubscription(args: {
  customerId: string;
  subscriptionId: string;
}): Promise<void> {
  return mollieDelete(
    `/customers/${args.customerId}/subscriptions/${args.subscriptionId}`,
  );
}

export function getSubscription(args: {
  customerId: string;
  subscriptionId: string;
}): Promise<MollieSubscription> {
  return mollieGet<MollieSubscription>(
    `/customers/${args.customerId}/subscriptions/${args.subscriptionId}`,
  );
}
