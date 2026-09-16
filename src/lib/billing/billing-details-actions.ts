"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth/session";
import { assertCan } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit/log";
import { blockDemoWrite } from "@/lib/demo/guard";
import type { ActionResult } from "@/lib/auth/schemas";
import { billingDetailsSchema, type BillingDetailsInput } from "./billing-details-schema";

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const p = i.path.join(".");
    if (!out[p]) out[p] = i.message;
  }
  return out;
}

export async function updateBillingDetailsAction(
  input: BillingDetailsInput,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "org:billing");
  const demoBlocked = blockDemoWrite(ctx);
  if (demoBlocked) return demoBlocked;

  const parsed = billingDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }

  await db.organization.update({
    where: { id: ctx.organization.id },
    data: {
      billingCompanyName: parsed.data.companyName,
      billingAddress: parsed.data.address,
      billingPostcode: parsed.data.postcode,
      billingCity: parsed.data.city,
      billingCountry: parsed.data.country,
      billingEmail: parsed.data.email || null,
      billingVatNumber: parsed.data.vatNumber || null,
    },
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "billing.details.update",
    resource: "organization",
    resourceId: ctx.organization.id,
    metadata: { hasVatNumber: Boolean(parsed.data.vatNumber) },
  });

  revalidatePath("/dashboard/settings/billing");
  return { ok: true };
}
