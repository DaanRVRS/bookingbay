import "server-only";
import { db } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/integrations/crypto";

export type PaymentProvider = "LOCATION" | "MOLLIE" | "STRIPE";

export interface DecryptedPaymentConfig {
  provider: PaymentProvider;
  mollieKey: string | null;
  stripeKey: string | null;
  stripeWebhookSecret: string | null;
}

export async function readPaymentConfig(
  organizationId: string,
): Promise<DecryptedPaymentConfig> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      paymentProvider: true,
      paymentMollieKeyEnc: true,
      paymentStripeKeyEnc: true,
      paymentStripeWebhookSecretEnc: true,
    },
  });
  if (!org) {
    return {
      provider: "LOCATION",
      mollieKey: null,
      stripeKey: null,
      stripeWebhookSecret: null,
    };
  }
  return {
    provider: (org.paymentProvider as PaymentProvider) ?? "LOCATION",
    mollieKey: safeDecrypt(org.paymentMollieKeyEnc),
    stripeKey: safeDecrypt(org.paymentStripeKeyEnc),
    stripeWebhookSecret: safeDecrypt(org.paymentStripeWebhookSecretEnc),
  };
}

function safeDecrypt(enc: string | null): string | null {
  if (!enc) return null;
  try {
    return decryptSecret(enc);
  } catch {
    return null;
  }
}

export function encryptIfPresent(value: string | null | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  return encryptSecret(v);
}

/**
 * Mask everything except first 4 + last 4 characters — UI-safe representation
 * of an API-key zonder de waarde aan de client te lekken.
 */
export function maskKey(key: string | null): string | null {
  if (!key) return null;
  if (key.length <= 12) return "•••••";
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}
