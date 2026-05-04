"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth/session";
import { assertCan } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/auth/schemas";

export const siteCustomizerSchema = z.object({
  heroTitle: z.string().max(120).optional().or(z.literal("")),
  heroSubtitle: z.string().max(280).optional().or(z.literal("")),
  aboutText: z.string().max(4000).optional().or(z.literal("")),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/i, "Gebruik hex (bv. #ef5934)")
    .optional()
    .or(z.literal("")),
  logoUrl: z.string().optional().or(z.literal("")).nullable(),
  contactEmail: z.email("Ongeldig e-mailadres").optional().or(z.literal("")),
  contactPhone: z.string().max(40).optional().or(z.literal("")),
  itemDisplayStyle: z.enum(["GRID", "LIST"]).default("GRID"),
});

export type SiteCustomizerInput = z.infer<typeof siteCustomizerSchema>;

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

  revalidatePath("/dashboard/site");
  revalidatePath(`/site/${ctx.organization.slug}`);
  return { ok: true };
}
