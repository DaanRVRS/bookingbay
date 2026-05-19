import "server-only";
import { db } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/integrations/crypto";

export type OnlineProvider = "MOLLIE" | "STRIPE" | null;

export interface DecryptedPaymentConfig {
  /** "Op locatie betalen" toegestaan in de widget. */
  acceptLocation: boolean;
  /** Actieve online provider (of null = online uit). */
  onlineProvider: OnlineProvider;
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
      acceptLocationPayment: true,
      onlinePaymentProvider: true,
      paymentMollieKeyEnc: true,
      paymentStripeKeyEnc: true,
      paymentStripeWebhookSecretEnc: true,
    },
  });
  if (!org) {
    return {
      acceptLocation: true,
      onlineProvider: null,
      mollieKey: null,
      stripeKey: null,
      stripeWebhookSecret: null,
    };
  }
  const prov = org.onlinePaymentProvider;
  return {
    acceptLocation: org.acceptLocationPayment,
    onlineProvider:
      prov === "MOLLIE" || prov === "STRIPE" ? prov : null,
    mollieKey: safeDecrypt(org.paymentMollieKeyEnc),
    stripeKey: safeDecrypt(org.paymentStripeKeyEnc),
    stripeWebhookSecret: safeDecrypt(org.paymentStripeWebhookSecretEnc),
  };
}

/** Heeft de org een werkende online-betaling (provider + bijbehorende key)? */
export function onlineReady(cfg: DecryptedPaymentConfig): boolean {
  if (cfg.onlineProvider === "MOLLIE") return Boolean(cfg.mollieKey);
  if (cfg.onlineProvider === "STRIPE") return Boolean(cfg.stripeKey);
  return false;
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
 * Mask everything except first 6 + last 4 characters — UI-safe representation
 * of an API-key zonder de waarde aan de client te lekken.
 */
export function maskKey(key: string | null): string | null {
  if (!key) return null;
  if (key.length <= 12) return "•••••";
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}
