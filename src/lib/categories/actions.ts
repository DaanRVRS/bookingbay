"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth/session";
import { assertCan } from "@/lib/auth/permissions";
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  type CategoryCreateInput,
  type CategoryUpdateInput,
} from "./schemas";
import type { ActionResult } from "@/lib/auth/schemas";

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const path = i.path.join(".");
    if (!out[path]) out[path] = i.message;
  }
  return out;
}

export async function createCategoryAction(
  input: CategoryCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "catalog:manage");

  const parsed = categoryCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }

  // Validate parent belongs to same org
  if (parsed.data.parentId) {
    const parent = await db.category.findFirst({
      where: { id: parsed.data.parentId, organizationId: ctx.organization.id },
    });
    if (!parent) {
      return { ok: false, error: "Bovenliggende categorie niet gevonden" };
    }
  }

  const last = await db.category.findFirst({
    where: { organizationId: ctx.organization.id, parentId: parsed.data.parentId ?? null },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const created = await db.category.create({
    data: {
      organizationId: ctx.organization.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      parentId: parsed.data.parentId ?? null,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
    select: { id: true },
  });

  revalidatePath("/dashboard/categories");
  revalidatePath("/dashboard");
  return { ok: true, data: { id: created.id } };
}

export async function updateCategoryAction(input: CategoryUpdateInput): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "catalog:manage");

  const parsed = categoryUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }

  const existing = await db.category.findFirst({
    where: { id: parsed.data.id, organizationId: ctx.organization.id },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };

  if (parsed.data.parentId === parsed.data.id) {
    return { ok: false, error: "Een categorie kan niet zijn eigen bovenliggende zijn" };
  }

  await db.category.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      parentId: parsed.data.parentId ?? null,
    },
  });

  revalidatePath("/dashboard/categories");
  return { ok: true };
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "catalog:manage");

  const existing = await db.category.findFirst({
    where: { id, organizationId: ctx.organization.id },
    include: { _count: { select: { items: true, children: true } } },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };

  if (existing._count.items > 0) {
    return {
      ok: false,
      error: `Categorie heeft ${existing._count.items} item${existing._count.items === 1 ? "" : "s"} — verplaats die eerst`,
    };
  }
  if (existing._count.children > 0) {
    return {
      ok: false,
      error: "Categorie heeft subcategorieën — verwijder die eerst",
    };
  }

  await db.category.delete({ where: { id } });

  revalidatePath("/dashboard/categories");
  revalidatePath("/dashboard");
  return { ok: true };
}
