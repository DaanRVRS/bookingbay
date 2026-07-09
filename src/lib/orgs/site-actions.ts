"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth/session";
import { assertCan } from "@/lib/auth/permissions";
import {
  siteCustomizerSchema,
  siteThemeIsCustomized,
  type SiteCustomizerInput,
} from "./site-schemas";
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

  // Thema alleen opslaan als er echt iets afwijkt van standaard — anders
  // null, zodat "alles standaard" ook echt leeg in de DB staat.
  const theme = parsed.data.theme;
  const themeHasValues = siteThemeIsCustomized(theme);

  await db.organization.update({
    where: { id: ctx.organization.id },
    data: {
      primaryColor: parsed.data.primaryColor || null,
      siteTheme: themeHasValues ? theme : Prisma.JsonNull,
      logoUrl: parsed.data.logoUrl || null,
      contactEmail: parsed.data.contactEmail || null,
      contactPhone: parsed.data.contactPhone || null,
      businessAddress: parsed.data.businessAddress || null,
      businessPostcode: parsed.data.businessPostcode || null,
      businessCity: parsed.data.businessCity || null,
      kvkNumber: parsed.data.kvkNumber || null,
      vatNumber: parsed.data.vatNumber || null,
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
  // /book + embed renderen logo/naam/primary-color → ook invalideren
  // zodat wijzigingen direct doorkomen i.p.v. binnen 60s ISR-window.
  revalidatePath(`/book/${ctx.organization.slug}`);
  revalidatePath(`/site/${ctx.organization.slug}/embed/book`);
  return { ok: true };
}
