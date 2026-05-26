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
  // 0 uur = klant mag tot startAt annuleren; 168 uur = 7 dagen.
  cancelHoursMin: z.coerce.number().int().min(0).max(168).default(24),
});

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const p = i.path.join(".");
    if (!out[p]) out[p] = i.message;
  }
  return out;
}

export async function updateCustomerPortalConfigAction(input: {
  enabled: boolean;
  cancelHoursMin: number;
}): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "org:manage");

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }

  await db.organization.update({
    where: { id: ctx.organization.id },
    data: {
      customerPortalEnabled: parsed.data.enabled,
      customerPortalCancelHoursMin: parsed.data.cancelHoursMin,
    },
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "org.customer-portal.update",
    resource: "organization",
    resourceId: ctx.organization.id,
    metadata: {
      enabled: parsed.data.enabled,
      cancelHoursMin: parsed.data.cancelHoursMin,
    },
  });

  revalidatePath("/dashboard/settings/organization");
  return { ok: true };
}
