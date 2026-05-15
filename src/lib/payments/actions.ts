"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth/session";
import { assertCan } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit/log";
import { encryptIfPresent } from "./config";
import type { ActionResult } from "@/lib/auth/schemas";

const inputSchema = z
  .object({
    provider: z.enum(["LOCATION", "MOLLIE", "STRIPE"]),
    // Optionele nieuwe waarden. Lege string = leegmaken; null/undefined = laat staan.
    mollieKey: z.string().optional(),
    clearMollie: z.boolean().optional(),
    stripeKey: z.string().optional(),
    clearStripe: z.boolean().optional(),
    stripeWebhookSecret: z.string().optional(),
  })
  .refine(
    (d) => {
      // XOR: provider MOLLIE vereist een mollie key (huidig of nieuw); STRIPE
      // idem voor stripe.
      if (d.provider === "MOLLIE" && d.clearMollie) return false;
      if (d.provider === "STRIPE" && d.clearStripe) return false;
      return true;
    },
    { message: "Je kunt de actieve provider's key niet leegmaken." },
  );

type Input = z.infer<typeof inputSchema>;

export async function savePaymentConfigAction(
  input: Input,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "org:billing");

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer" };
  }
  const data = parsed.data;

  const current = await db.organization.findUnique({
    where: { id: ctx.organization.id },
    select: {
      paymentMollieKeyEnc: true,
      paymentStripeKeyEnc: true,
    },
  });
  if (!current) return { ok: false, error: "Organisatie niet gevonden" };

  // Bepaal nieuwe waarden:
  // - clearX === true → null
  // - keyX is non-empty → versleutel
  // - anders: laat huidige waarde staan
  let nextMollie = current.paymentMollieKeyEnc;
  if (data.clearMollie) {
    nextMollie = null;
  } else if (data.mollieKey && data.mollieKey.trim().length > 0) {
    if (!data.mollieKey.startsWith("test_") && !data.mollieKey.startsWith("live_")) {
      return {
        ok: false,
        error: "Mollie API-key moet beginnen met 'test_' of 'live_'.",
      };
    }
    nextMollie = encryptIfPresent(data.mollieKey);
  }

  let nextStripe = current.paymentStripeKeyEnc;
  if (data.clearStripe) {
    nextStripe = null;
  } else if (data.stripeKey && data.stripeKey.trim().length > 0) {
    if (
      !data.stripeKey.startsWith("sk_test_") &&
      !data.stripeKey.startsWith("sk_live_")
    ) {
      return {
        ok: false,
        error: "Stripe key moet beginnen met 'sk_test_' of 'sk_live_'.",
      };
    }
    nextStripe = encryptIfPresent(data.stripeKey);
  }

  // Provider-validatie: MOLLIE vereist mollie key, STRIPE vereist stripe key.
  if (data.provider === "MOLLIE" && !nextMollie) {
    return { ok: false, error: "Vul een Mollie API-key in om Mollie te gebruiken." };
  }
  if (data.provider === "STRIPE" && !nextStripe) {
    return { ok: false, error: "Vul een Stripe key in om Stripe te gebruiken." };
  }

  // XOR: bij activatie van Mollie de stripe key clearen (en vice versa) zodat
  // er geen verwarring ontstaat.
  if (data.provider === "MOLLIE") nextStripe = null;
  if (data.provider === "STRIPE") nextMollie = null;

  let nextStripeWh: string | null = null;
  if (data.stripeWebhookSecret && data.stripeWebhookSecret.trim().length > 0) {
    nextStripeWh = encryptIfPresent(data.stripeWebhookSecret);
  }

  await db.organization.update({
    where: { id: ctx.organization.id },
    data: {
      paymentProvider: data.provider,
      paymentMollieKeyEnc: nextMollie,
      paymentStripeKeyEnc: nextStripe,
      paymentStripeWebhookSecretEnc: nextStripeWh,
    },
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "org.payment.update",
    resource: "organization",
    resourceId: ctx.organization.id,
    metadata: { provider: data.provider },
  });

  revalidatePath("/dashboard/settings/organization");
  return { ok: true };
}
