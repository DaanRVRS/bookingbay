"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth/session";
import { assertCan } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/auth/schemas";

export async function markLeadHandledAction(id: string, handled: boolean): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "bookings:manage");

  const lead = await db.lead.findFirst({
    where: { id, organizationId: ctx.organization.id },
    select: { id: true },
  });
  if (!lead) return { ok: false, error: "Lead niet gevonden" };

  await db.lead.update({
    where: { id },
    data: { handledAt: handled ? new Date() : null },
  });

  revalidatePath("/dashboard/leads");
  return { ok: true };
}

export async function deleteLeadAction(id: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "bookings:manage");

  const lead = await db.lead.findFirst({
    where: { id, organizationId: ctx.organization.id },
    select: { id: true },
  });
  if (!lead) return { ok: false, error: "Lead niet gevonden" };

  await db.lead.delete({ where: { id } });

  revalidatePath("/dashboard/leads");
  return { ok: true };
}
