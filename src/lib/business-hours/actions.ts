"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/auth/schemas";
import { audit } from "@/lib/audit/log";
import { blockDemoWrite } from "@/lib/demo/guard";
import { businessHoursSchema, type BusinessHours } from "./schemas";

/** Org-level openingstijden bijwerken. `null` wist ze (24/7). */
export async function setOrgBusinessHoursAction(
  hours: BusinessHours | null,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  if (!can(ctx.membership.role, "org:manage")) {
    return { ok: false, error: "Je hebt geen rechten om dit te wijzigen." };
  }
  const demoBlocked = blockDemoWrite(ctx);
  if (demoBlocked) return demoBlocked;

  const data = hours === null ? null : businessHoursSchema.parse(hours);

  await db.organization.update({
    where: { id: ctx.organization.id },
    data: {
      businessHours:
        data === null ? Prisma.JsonNull : (data as Prisma.InputJsonValue),
    },
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "org.update",
    resource: "organization",
    resourceId: ctx.organization.id,
    metadata: { kind: "businessHours", cleared: data === null },
  });

  revalidatePath("/dashboard/settings/organization");
  revalidatePath(`/site/${ctx.organization.slug}`);
  return { ok: true };
}

/** Item-niveau override. `null` zet 'm uit (val terug op org-default). */
export async function setItemBusinessHoursOverrideAction(
  itemId: string,
  hours: BusinessHours | null,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  if (!can(ctx.membership.role, "catalog:manage")) {
    return { ok: false, error: "Je hebt geen rechten om dit te wijzigen." };
  }
  const demoBlocked = blockDemoWrite(ctx);
  if (demoBlocked) return demoBlocked;

  const item = await db.item.findUnique({
    where: { id: itemId },
    select: { id: true, organizationId: true },
  });
  if (!item || item.organizationId !== ctx.organization.id) {
    return { ok: false, error: "Item niet gevonden." };
  }

  const data = hours === null ? null : businessHoursSchema.parse(hours);

  await db.item.update({
    where: { id: itemId },
    data: {
      businessHoursOverride:
        data === null ? Prisma.JsonNull : (data as Prisma.InputJsonValue),
    },
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "item.update",
    resource: "item",
    resourceId: itemId,
    metadata: { kind: "businessHoursOverride", cleared: data === null },
  });

  revalidatePath("/dashboard/items");
  revalidatePath(`/dashboard/items/${itemId}`);
  return { ok: true };
}
