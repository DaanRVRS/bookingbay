import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth/session";
import { assertCan } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit/log";
import { blockDemoWriteResponse } from "@/lib/demo/guard";
import { encryptIfPresent } from "@/lib/payments/config";
import { isEncryptionConfigured } from "@/lib/integrations/crypto";
import { revalidatePath } from "next/cache";

/**
 * Opslaan van de betaal-configuratie (op locatie aan/uit, online-provider
 * Mollie/Stripe, API-keys). Bewust een gewone API-route i.p.v. Server
 * Action — Server Actions zijn na elke redeploy gevoelig voor action-ID-
 * skew waardoor opslaan "This page couldn't be loaded" gaf. Dezelfde
 * logica, alleen via fetch().
 */

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  acceptLocation: z.boolean(),
  onlineProvider: z.enum(["MOLLIE", "STRIPE"]).nullable().optional(),
  mollieKey: z.string().optional(),
  clearMollie: z.boolean().optional(),
  stripeKey: z.string().optional(),
  clearStripe: z.boolean().optional(),
  stripeWebhookSecret: z.string().optional(),
});

export async function POST(req: Request) {
 try {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Ongeldige invoer" },
      { status: 400 },
    );
  }

  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Ongeldige invoer" },
      { status: 400 },
    );
  }

  let ctx;
  try {
    ctx = await requireOrg();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Niet ingelogd" },
      { status: 401 },
    );
  }
  try {
    assertCan(ctx.membership.role, "org:billing");
  } catch {
    return NextResponse.json(
      { ok: false, error: "Geen rechten" },
      { status: 403 },
    );
  }
  const blocked = blockDemoWriteResponse(ctx);
  if (blocked) return blocked;

  const data = parsed.data;
  const onlineProvider = data.onlineProvider ?? null;

  // Een nieuwe key opslaan vereist een geconfigureerde versleutel-sleutel.
  // Zonder zou encryptSecret() throwen → HTTP 500 → de client kan de JSON
  // niet lezen en toont onterecht "Verbinding mislukt". Vang het hier af
  // met een duidelijke, leesbare melding.
  const wantsNewSecret = Boolean(
    data.mollieKey?.trim() ||
      data.stripeKey?.trim() ||
      data.stripeWebhookSecret?.trim(),
  );
  if (wantsNewSecret && !isEncryptionConfigured()) {
    return NextResponse.json({
      ok: false,
      error:
        "Online betalen kan nog niet ingesteld worden: de server-versleutelsleutel (INTEGRATION_ENCRYPTION_KEY) ontbreekt. Neem contact op met de beheerder.",
    });
  }

  const current = await db.organization.findUnique({
    where: { id: ctx.organization.id },
    select: { paymentMollieKeyEnc: true, paymentStripeKeyEnc: true },
  });
  if (!current) {
    return NextResponse.json(
      { ok: false, error: "Organisatie niet gevonden" },
      { status: 404 },
    );
  }

  // Sleutel-resolutie: clear → null; nieuwe waarde → versleutel; anders behouden.
  let nextMollie = current.paymentMollieKeyEnc;
  if (data.clearMollie) {
    nextMollie = null;
  } else if (data.mollieKey && data.mollieKey.trim().length > 0) {
    if (
      !data.mollieKey.startsWith("test_") &&
      !data.mollieKey.startsWith("live_")
    ) {
      return NextResponse.json({
        ok: false,
        error: "Mollie API-key moet beginnen met 'test_' of 'live_'.",
      });
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
      return NextResponse.json({
        ok: false,
        error: "Stripe key moet beginnen met 'sk_test_' of 'sk_live_'.",
      });
    }
    nextStripe = encryptIfPresent(data.stripeKey);
  }

  if (onlineProvider === "MOLLIE" && !nextMollie) {
    return NextResponse.json({
      ok: false,
      error: "Vul een Mollie API-key in om online via Mollie te accepteren.",
    });
  }
  if (onlineProvider === "STRIPE" && !nextStripe) {
    return NextResponse.json({
      ok: false,
      error: "Vul een Stripe key in om online via Stripe te accepteren.",
    });
  }

  if (!data.acceptLocation && !onlineProvider) {
    return NextResponse.json({
      ok: false,
      error: "Zet minimaal één betaalmethode aan (op locatie of online).",
    });
  }

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
  return NextResponse.json({ ok: true });
 } catch (err) {
    // Een versleutel-fout (bv. ontbrekende/ongeldige INTEGRATION_ENCRYPTION_KEY)
    // of DB-fout zou anders een kale HTTP 500 geven — de client kan die JSON
    // niet lezen en toont onterecht "Verbinding mislukt". Vang het af en geef
    // de échte reden door zodat het probleem leesbaar wordt.
    console.error("[payment-config] opslaan mislukt:", err);
    const msg = err instanceof Error ? err.message : "Onbekende serverfout";
    return NextResponse.json({
      ok: false,
      error: `Opslaan mislukt op de server: ${msg}`,
    });
 }
}
