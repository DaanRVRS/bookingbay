"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth/session";
import { assertCan } from "@/lib/auth/permissions";
import { planAllows, assertPageQuotaOk } from "@/lib/plans";
import type { Plan } from "@prisma/client";
import type { ActionResult } from "@/lib/auth/schemas";
import { audit } from "@/lib/audit/log";
import {
  pageCreateSchema,
  pageMetaUpdateSchema,
  pageBlocksUpdateSchema,
  RESERVED_SLUGS,
  type PageCreateInput,
  type PageMetaUpdateInput,
  type PageBlocksUpdateInput,
} from "./schemas";

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const path = i.path.join(".");
    if (!out[path]) out[path] = i.message;
  }
  return out;
}

function assertPageBuilderAllowed(plan: Plan): void {
  if (!planAllows(plan, "pageBuilder")) {
    throw new Error(
      "Je huidige plan bevat geen page-builder. Upgrade naar Professional of hoger.",
    );
  }
}

export async function createPageAction(
  input: PageCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "site:customize");

  const org = await db.organization.findUnique({
    where: { id: ctx.organization.id },
    select: { plan: true },
  });
  if (!org) return { ok: false, error: "Organisatie niet gevonden" };
  assertPageBuilderAllowed(org.plan);

  const parsed = pageCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }
  if (RESERVED_SLUGS.has(parsed.data.slug)) {
    return { ok: false, error: `'${parsed.data.slug}' is gereserveerd, kies een andere slug.` };
  }

  const count = await db.page.count({ where: { organizationId: ctx.organization.id } });
  try {
    assertPageQuotaOk(org.plan, count);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Limiet bereikt" };
  }

  const existing = await db.page.findFirst({
    where: { organizationId: ctx.organization.id, slug: parsed.data.slug },
    select: { id: true },
  });
  if (existing) return { ok: false, error: "Een pagina met deze slug bestaat al" };

  const last = await db.page.findFirst({
    where: { organizationId: ctx.organization.id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const created = await db.page.create({
    data: {
      organizationId: ctx.organization.id,
      title: parsed.data.title,
      slug: parsed.data.slug,
      blocks: [],
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
    select: { id: true },
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "page.create",
    resource: "page",
    resourceId: created.id,
    metadata: { title: parsed.data.title, slug: parsed.data.slug },
  });

  revalidatePath("/dashboard/site/pages");
  return { ok: true, data: { id: created.id } };
}

export async function updatePageMetaAction(
  input: PageMetaUpdateInput,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "site:customize");

  const parsed = pageMetaUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }
  if (RESERVED_SLUGS.has(parsed.data.slug)) {
    return { ok: false, error: `'${parsed.data.slug}' is gereserveerd.` };
  }

  const existing = await db.page.findFirst({
    where: { id: parsed.data.id, organizationId: ctx.organization.id },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };

  // The home page is special: its slug must remain "home" — UI hides the
  // slug field, but enforce here too in case someone bypasses it.
  const isHome = existing.slug === "home";
  const targetSlug = isHome ? "home" : parsed.data.slug;

  if (targetSlug !== existing.slug) {
    const collision = await db.page.findFirst({
      where: {
        organizationId: ctx.organization.id,
        slug: targetSlug,
        NOT: { id: parsed.data.id },
      },
      select: { id: true },
    });
    if (collision) return { ok: false, error: "Een andere pagina gebruikt al deze slug" };
  }

  await db.page.update({
    where: { id: parsed.data.id },
    data: {
      title: parsed.data.title,
      slug: targetSlug,
      // Home page is always published — otherwise the tenant root breaks.
      isPublished: isHome ? true : parsed.data.isPublished,
      showInNav: parsed.data.showInNav,
    },
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "page.update",
    resource: "page",
    resourceId: parsed.data.id,
    metadata: { title: parsed.data.title, slug: parsed.data.slug, kind: "meta" },
  });

  revalidatePath("/dashboard/site/pages");
  revalidatePath(`/dashboard/site/pages/${parsed.data.id}`);
  return { ok: true };
}

export async function updatePageBlocksAction(
  input: PageBlocksUpdateInput,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "site:customize");

  const parsed = pageBlocksUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige inhoud", fieldErrors: fieldErrors(parsed.error) };
  }

  const existing = await db.page.findFirst({
    where: { id: parsed.data.id, organizationId: ctx.organization.id },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };

  await db.page.update({
    where: { id: parsed.data.id },
    data: { blocks: parsed.data.blocks },
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "page.update",
    resource: "page",
    resourceId: parsed.data.id,
    metadata: { kind: "blocks", blockCount: parsed.data.blocks.length },
  });

  revalidatePath(`/dashboard/site/pages/${parsed.data.id}`);
  return { ok: true };
}

export async function deletePageAction(id: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "site:customize");

  const existing = await db.page.findFirst({
    where: { id, organizationId: ctx.organization.id },
    select: { id: true, slug: true },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };
  if (existing.slug === "home") {
    return {
      ok: false,
      error: "De homepagina kan niet verwijderd worden — leegmaken kan wel.",
    };
  }

  await db.page.delete({ where: { id } });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "page.delete",
    resource: "page",
    resourceId: id,
  });

  revalidatePath("/dashboard/site/pages");
  return { ok: true };
}

export async function reorderPagesAction(input: {
  orderedIds: string[];
}): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "site:customize");

  if (!Array.isArray(input.orderedIds) || input.orderedIds.length === 0) {
    return { ok: false, error: "Lege volgorde" };
  }

  const pages = await db.page.findMany({
    where: { id: { in: input.orderedIds }, organizationId: ctx.organization.id },
    select: { id: true },
  });
  if (pages.length !== input.orderedIds.length) {
    return { ok: false, error: "Onbekende pagina in volgorde" };
  }

  await db.$transaction(
    input.orderedIds.map((id, idx) =>
      db.page.update({ where: { id }, data: { sortOrder: idx } }),
    ),
  );

  revalidatePath("/dashboard/site/pages");
  return { ok: true };
}
