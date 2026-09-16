"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth/session";
import { assertCan } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit/log";
import { blockDemoWrite } from "@/lib/demo/guard";
import type { ActionResult } from "@/lib/auth/schemas";

const httpUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Moet beginnen met http(s)://");

const schema = z.object({
  privacyUrl: httpUrl,
  termsUrl: httpUrl,
  phoneRequired: z.boolean(),
  ageCheckEnabled: z.boolean(),
});

export type BookingLegalInput = z.infer<typeof schema>;

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const p = i.path.join(".");
    if (!out[p]) out[p] = i.message;
  }
  return out;
}

/**
 * Juridische instellingen voor klantsite en boekwidget: eigen voorwaarden
 * en privacyverklaring (links in footer + consentregel, verplichte checkbox
 * bij voorwaarden), telefoonnummer verplicht en het leeftijdsvinkje.
 */
export async function updateBookingLegalAction(
  input: BookingLegalInput,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "org:manage");
  const demoBlocked = blockDemoWrite(ctx);
  if (demoBlocked) return demoBlocked;

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }

  await db.organization.update({
    where: { id: ctx.organization.id },
    data: {
      privacyUrl: parsed.data.privacyUrl || null,
      termsUrl: parsed.data.termsUrl || null,
      widgetPhoneRequired: parsed.data.phoneRequired,
      widgetAgeCheckEnabled: parsed.data.ageCheckEnabled,
    },
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "org.booking-legal.update",
    resource: "organization",
    resourceId: ctx.organization.id,
    metadata: {
      hasPrivacyUrl: Boolean(parsed.data.privacyUrl),
      hasTermsUrl: Boolean(parsed.data.termsUrl),
      phoneRequired: parsed.data.phoneRequired,
      ageCheckEnabled: parsed.data.ageCheckEnabled,
    },
  });

  const slug = ctx.organization.slug;
  revalidatePath("/dashboard/settings/organization");
  revalidatePath(`/site/${slug}`, "layout");
  revalidatePath(`/book/${slug}`);
  revalidatePath(`/site/${slug}/embed/book`);
  return { ok: true };
}
