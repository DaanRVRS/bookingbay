"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth/session";
import { assertCan } from "@/lib/auth/permissions";
import {
  itemCreateSchema,
  itemUpdateSchema,
  type ItemCreateInput,
  type ItemUpdateInput,
} from "./schemas";
import type { ActionResult } from "@/lib/auth/schemas";
import { planLimits } from "@/lib/plans";
import { audit } from "@/lib/audit/log";
import { assertOrgActive } from "@/lib/billing/guard";
import { blockDemoWrite } from "@/lib/demo/guard";

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const path = i.path.join(".");
    if (!out[path]) out[path] = i.message;
  }
  return out;
}

async function assertCategoryInOrg(categoryId: string, orgId: string) {
  const cat = await db.category.findFirst({
    where: { id: categoryId, organizationId: orgId },
    select: { id: true },
  });
  if (!cat) throw new Error("Categorie niet gevonden");
}

export async function createItemAction(
  input: ItemCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "catalog:manage");
  const demoBlocked = blockDemoWrite(ctx);
  if (demoBlocked) return demoBlocked;
  const blocked = await assertOrgActive(ctx.organization.id);
  if (blocked) return blocked;

  const parsed = itemCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }

  try {
    await assertCategoryInOrg(parsed.data.categoryId, ctx.organization.id);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Categorie ongeldig" };
  }

  // Plan limit on number of active items
  const orgPlan = await db.organization.findUnique({
    where: { id: ctx.organization.id },
    select: { plan: true },
  });
  if (orgPlan) {
    const limit = planLimits(orgPlan.plan);
    if (Number.isFinite(limit.maxItems)) {
      const count = await db.item.count({
        where: { organizationId: ctx.organization.id, isActive: true },
      });
      if (count >= limit.maxItems) {
        return {
          ok: false,
          error: `Je ${limit.label}-plan bevat ${limit.maxItems} items. Upgrade om meer toe te voegen.`,
        };
      }
    }
  }

  const created = await db.item.create({
    data: {
      organizationId: ctx.organization.id,
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      imageUrl: parsed.data.imageUrl || null,
      pricePerHour: parsed.data.pricePerHour,
      pricePerDay: parsed.data.pricePerDay,
      pricePerWeek: parsed.data.pricePerWeek,
      deposit: parsed.data.deposit,
      cleaningFee: parsed.data.cleaningFee,
      quantity: parsed.data.quantity,
      isActive: parsed.data.isActive,
      isAddon: parsed.data.isAddon,
      addonPrice: parsed.data.addonPrice,
      addonCategoryIds:
        parsed.data.addonCategoryIds === undefined
          ? undefined
          : parsed.data.addonCategoryIds === null ||
              parsed.data.addonCategoryIds.length === 0
            ? Prisma.JsonNull
            : parsed.data.addonCategoryIds,
      bookingIntervalMinutes: parsed.data.bookingIntervalMinutes,
      bookingWindowStartMin: parsed.data.bookingWindowStartMin,
      bookingWindowEndMin: parsed.data.bookingWindowEndMin,
      businessHoursOverride:
        parsed.data.businessHoursOverride === undefined
          ? undefined
          : parsed.data.businessHoursOverride === null
            ? Prisma.JsonNull
            : (parsed.data.businessHoursOverride as Prisma.InputJsonValue),
    },
    select: { id: true },
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "item.create",
    resource: "item",
    resourceId: created.id,
    metadata: { name: parsed.data.name, categoryId: parsed.data.categoryId },
  });

  revalidatePath("/dashboard/items");
  revalidatePath("/dashboard");
  return { ok: true, data: { id: created.id } };
}

export async function updateItemAction(input: ItemUpdateInput): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "catalog:manage");
  const demoBlocked = blockDemoWrite(ctx);
  if (demoBlocked) return demoBlocked;

  const parsed = itemUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }

  const existing = await db.item.findFirst({
    where: { id: parsed.data.id, organizationId: ctx.organization.id },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };

  try {
    await assertCategoryInOrg(parsed.data.categoryId, ctx.organization.id);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Categorie ongeldig" };
  }

  // Plan-limiet ook hier afdwingen: een inactief item activeren (false -> true)
  // mag de actieve-item-limiet niet overschrijden. Anders kon je de limiet
  // omzeilen door items inactief aan te maken en daarna te activeren.
  if (parsed.data.isActive && !existing.isActive) {
    const orgPlan = await db.organization.findUnique({
      where: { id: ctx.organization.id },
      select: { plan: true },
    });
    if (orgPlan) {
      const limit = planLimits(orgPlan.plan);
      if (Number.isFinite(limit.maxItems)) {
        const count = await db.item.count({
          where: { organizationId: ctx.organization.id, isActive: true },
        });
        if (count >= limit.maxItems) {
          return {
            ok: false,
            error: `Je ${limit.label}-plan staat ${limit.maxItems} actieve items toe. Upgrade of deactiveer eerst een ander item.`,
          };
        }
      }
    }
  }

  await db.item.update({
    where: { id: parsed.data.id },
    data: {
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      imageUrl: parsed.data.imageUrl || null,
      pricePerHour: parsed.data.pricePerHour,
      pricePerDay: parsed.data.pricePerDay,
      pricePerWeek: parsed.data.pricePerWeek,
      deposit: parsed.data.deposit,
      cleaningFee: parsed.data.cleaningFee,
      quantity: parsed.data.quantity,
      isActive: parsed.data.isActive,
      isAddon: parsed.data.isAddon,
      addonPrice: parsed.data.addonPrice,
      addonCategoryIds:
        parsed.data.addonCategoryIds === undefined
          ? undefined
          : parsed.data.addonCategoryIds === null ||
              parsed.data.addonCategoryIds.length === 0
            ? Prisma.JsonNull
            : parsed.data.addonCategoryIds,
      bookingIntervalMinutes: parsed.data.bookingIntervalMinutes,
      bookingWindowStartMin: parsed.data.bookingWindowStartMin,
      bookingWindowEndMin: parsed.data.bookingWindowEndMin,
      businessHoursOverride:
        parsed.data.businessHoursOverride === undefined
          ? undefined
          : parsed.data.businessHoursOverride === null
            ? Prisma.JsonNull
            : (parsed.data.businessHoursOverride as Prisma.InputJsonValue),
    },
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "item.update",
    resource: "item",
    resourceId: parsed.data.id,
    metadata: { name: parsed.data.name, isActive: parsed.data.isActive },
  });

  revalidatePath("/dashboard/items");
  revalidatePath(`/dashboard/items/${parsed.data.id}`);
  return { ok: true };
}

export async function deleteItemAction(id: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "catalog:manage");
  const demoBlocked = blockDemoWrite(ctx);
  if (demoBlocked) return demoBlocked;

  const existing = await db.item.findFirst({
    where: { id, organizationId: ctx.organization.id },
    include: { _count: { select: { bookings: true } } },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };

  if (existing._count.bookings > 0) {
    // Soft-deactivate instead of deleting when bookings exist
    await db.item.update({ where: { id }, data: { isActive: false } });
    await audit({
      organizationId: ctx.organization.id,
      actorUserId: ctx.user.id,
      action: "item.update",
      resource: "item",
      resourceId: id,
      metadata: { name: existing.name, softDelete: true },
    });
    revalidatePath("/dashboard/items");
    return { ok: true };
  }

  await db.item.delete({ where: { id } });
  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "item.delete",
    resource: "item",
    resourceId: id,
    metadata: { name: existing.name },
  });
  revalidatePath("/dashboard/items");
  revalidatePath("/dashboard");
  return { ok: true };
}
