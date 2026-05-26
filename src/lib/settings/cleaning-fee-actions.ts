"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth/session";
import { assertCan } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit/log";
import type { ActionResult } from "@/lib/auth/schemas";

const schema = z.object({
  enabled: z.boolean(),
  // Bedrag in centen — UI laat de gebruiker euro met decimalen invullen
  // en converteert daar; we slaan integer-cents op om floating-point
  // afrondings-gedoe te vermijden. Cap op €500 omdat een schoonmaakfee
  // hoger dan dat vrijwel zeker een typo is.
  cents: z.coerce.number().int().min(0).max(50_000),
});

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const p = i.path.join(".");
    if (!out[p]) out[p] = i.message;
  }
  return out;
}

export async function updateCleaningFeeAction(input: {
  enabled: boolean;
  cents: number;
}): Promise<ActionResult> {
  const ctx = await requireOrg();
  // Pricing-config valt onder billing-rechten (zelfde als de payment-keys).
  assertCan(ctx.membership.role, "org:billing");

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }

  if (parsed.data.enabled && parsed.data.cents <= 0) {
    return {
      ok: false,
      error: "Vul een bedrag boven €0 in om schoonmaakkosten aan te zetten",
      fieldErrors: { cents: "Moet > 0 zijn" },
    };
  }

  await db.organization.update({
    where: { id: ctx.organization.id },
    data: {
      cleaningFeeEnabled: parsed.data.enabled,
      cleaningFeeCents: parsed.data.cents,
    },
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "org.cleaning-fee.update",
    resource: "organization",
    resourceId: ctx.organization.id,
    metadata: {
      enabled: parsed.data.enabled,
      cents: parsed.data.cents,
    },
  });

  revalidatePath("/dashboard/settings/organization");
  // Widget-pages cachen 60s — direct invalideren zodat een fee-wijziging
  // niet een minuut zichtbaar is voor klanten met de oude prijs.
  revalidatePath(`/book/${ctx.organization.slug}`);
  revalidatePath(`/site/${ctx.organization.slug}/embed/book`);
  return { ok: true };
}
