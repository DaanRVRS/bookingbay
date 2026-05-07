"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth/session";
import { assertCan } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit/log";
import type { ActionResult } from "@/lib/auth/schemas";
import {
  reviewCreateSchema,
  reviewReorderSchema,
  reviewUpdateSchema,
  type ReviewCreateInput,
  type ReviewUpdateInput,
} from "./schemas";

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const path = i.path.join(".");
    if (!out[path]) out[path] = i.message;
  }
  return out;
}

export async function createReviewAction(
  input: ReviewCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "site:customize");

  const parsed = reviewCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }

  const last = await db.review.findFirst({
    where: { organizationId: ctx.organization.id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const created = await db.review.create({
    data: {
      organizationId: ctx.organization.id,
      quote: parsed.data.quote,
      author: parsed.data.author,
      role: parsed.data.role || null,
      rating: parsed.data.rating,
      isPublished: parsed.data.isPublished,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
    select: { id: true },
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "review.create",
    resource: "review",
    resourceId: created.id,
    metadata: { author: parsed.data.author },
  });

  revalidatePath("/dashboard/reviews");
  return { ok: true, data: { id: created.id } };
}

export async function updateReviewAction(
  input: ReviewUpdateInput,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "site:customize");

  const parsed = reviewUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }

  const existing = await db.review.findFirst({
    where: { id: parsed.data.id, organizationId: ctx.organization.id },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };

  await db.review.update({
    where: { id: parsed.data.id },
    data: {
      quote: parsed.data.quote,
      author: parsed.data.author,
      role: parsed.data.role || null,
      rating: parsed.data.rating,
      isPublished: parsed.data.isPublished,
    },
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "review.update",
    resource: "review",
    resourceId: parsed.data.id,
    metadata: { author: parsed.data.author },
  });

  revalidatePath("/dashboard/reviews");
  return { ok: true };
}

export async function deleteReviewAction(id: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "site:customize");

  const existing = await db.review.findFirst({
    where: { id, organizationId: ctx.organization.id },
    select: { id: true, author: true },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };

  await db.review.delete({ where: { id } });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "review.delete",
    resource: "review",
    resourceId: id,
    metadata: { author: existing.author },
  });

  revalidatePath("/dashboard/reviews");
  return { ok: true };
}

export async function reorderReviewsAction(input: {
  orderedIds: string[];
}): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "site:customize");

  const parsed = reviewReorderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Lege volgorde" };

  const reviews = await db.review.findMany({
    where: { id: { in: parsed.data.orderedIds }, organizationId: ctx.organization.id },
    select: { id: true },
  });
  if (reviews.length !== parsed.data.orderedIds.length) {
    return { ok: false, error: "Onbekende review in volgorde" };
  }

  await db.$transaction(
    parsed.data.orderedIds.map((id, idx) =>
      db.review.update({ where: { id }, data: { sortOrder: idx } }),
    ),
  );

  revalidatePath("/dashboard/reviews");
  return { ok: true };
}
