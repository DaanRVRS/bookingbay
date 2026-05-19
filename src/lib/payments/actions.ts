"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth/session";
import { assertCan } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit/log";
import { encryptIfPresent } from "./config";
import type { ActionResult } from "@/lib/auth/schemas";

const inputSchema = z.object({
  acceptLocation: z.boolean(),
  // null/"" = online uit
  onlineProvider: z.enum(["MOLLIE", "STRIPE"]).nullable().optional(),
  mollieKey: z.string().optional(),
  clearMollie: z.boolean().optional(),
  stripeKey: z.string().optional(),
  clearStripe: z.boolean().optional(),
  stripeWebhookSecret: z.string().optional(),
});

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
  const onlineProvider = data.onlineProvider ?? null;

  const current = await db.organization.findUnique({
    where: { id: ctx.organization.id },
    select: { paymentMollieKeyEnc: true, paymentStripeKeyEnc: true },
  });
  if (!current) return { ok: false, error: "Organisatie niet gevonden" };

  // Sleutel-resolutie: clear → null; nieuwe waarde → versleutel; anders behouden.
  let nextMollie = current.paymentMollieKeyEnc;
  if (data.clearMollie) {
    nextMollie = null;
  } else if (data.mollieKey && data.mollieKey.trim().length > 0) {
    if (
      !data.mollieKey.startsWith("test_") &&
      !data.mollieKey.startsWith("live_")
    ) {
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

  // Validatie: gekozen online provider vereist een bijbehorende key.
  if (onlineProvider === "MOLLIE" && !nextMollie) {
    return {
      ok: false,
      error: "Vul een Mollie API-key in om online via Mollie te accepteren.",
    };
  }
  if (onlineProvider === "STRIPE" && !nextStripe) {
    return {
      ok: false,
      error: "Vul een Stripe key in om online via Stripe te accepteren.",
    };
  }

  // Minstens één betaalmethode moet aan staan.
  if (!data.acceptLocation && !onlineProvider) {
    return {
      ok: false,
      error: "Zet minimaal één betaalmethode aan (op locatie of online).",
    };
  }

  // undefined = niet wijzigen (laat bestaande secret staan).
  let nextStripeWh: string | null | undefined = undefined;
  if (data.stripeWebhookSecret && data.stripeWebhookSecret.trim().length > 0) {
    nextStripeWh = encryptIfPresent(data.stripeWebhookSecret);
  }

  await db.organization.update({
    where: { id: ctx.organization.id },
    data: {
      acceptLocationPayment: data.acceptLocation,
      onlinePaymentProvider: onlineProvider,
      paymentMollieKeyEnc: nextMollie,
      paymentStripeKeyEnc: nextStripe,
      ...(nextStripeWh !== undefined
        ? { paymentStripeWebhookSecretEnc: nextStripeWh }
        : {}),
      // Legacy kolom in sync houden voor het geval iets het nog leest.
      paymentProvider: onlineProvider ?? "LOCATION",
    },
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "org.payment.update",
    resource: "organization",
    resourceId: ctx.organization.id,
    metadata: { acceptLocation: data.acceptLocation, onlineProvider },
  });

  revalidatePath("/dashboard/settings/organization");
  return { ok: true };
}
