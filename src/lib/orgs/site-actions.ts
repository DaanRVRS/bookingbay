"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth/session";
import { assertCan } from "@/lib/auth/permissions";
import { siteCustomizerSchema, type SiteCustomizerInput } from "./site-schemas";
import type { ActionResult } from "@/lib/auth/schemas";
import { audit } from "@/lib/audit/log";

export async function updateSiteAction(input: SiteCustomizerInput): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "site:customize");

  const parsed = siteCustomizerSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const path = i.path.join(".");
      if (!fields[path]) fields[path] = i.message;
    }
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fields };
  }

  await db.organization.update({
    where: { id: ctx.organization.id },
    data: {
      heroTitle: parsed.data.heroTitle || null,
      heroSubtitle: parsed.data.heroSubtitle || null,
      aboutText: parsed.data.aboutText || null,
      primaryColor: parsed.data.primaryColor || null,
      logoUrl: parsed.data.logoUrl || null,
      contactEmail: parsed.data.contactEmail || null,
      contactPhone: parsed.data.contactPhone || null,
      itemDisplayStyle: parsed.data.itemDisplayStyle,
    },
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "site.update",
    resource: "organization",
    resourceId: ctx.organization.id,
  });

  revalidatePath("/dashboard/site");
  revalidatePath(`/site/${ctx.organization.slug}`);
  return { ok: true };
}
