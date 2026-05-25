"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth/session";
import { assertCan } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit/log";
import type { ActionResult } from "@/lib/auth/schemas";

const schema = z.object({
  enabled: z.boolean(),
  // Lege string mag — feature wordt dan effectief uit gezet (cron heeft
  // een filter `reviewRequestUrl: { not: null }`). URL-vorm checken alleen
  // wanneer enabled = true.
  url: z.string().trim().max(500).default(""),
  delayDays: z.coerce.number().int().min(0).max(30).default(3),
});

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const p = i.path.join(".");
    if (!out[p]) out[p] = i.message;
  }
  return out;
}

export async function updateReviewRequestConfigAction(input: {
  enabled: boolean;
  url: string;
  delayDays: number;
}): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "org:manage");

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }

  const url = parsed.data.url || "";
  if (parsed.data.enabled) {
    if (!url) {
      return {
        ok: false,
        error: "Vul een review-link in om de uitvraag aan te zetten",
        fieldErrors: { url: "Verplicht bij ingeschakelde uitvraag" },
      };
    }
    // Soepele URL-check: protocol vereist, geen zware schema-validatie
    // (Google review-URLs zijn lang en lelijk maar wel geldig).
    if (!/^https?:\/\//i.test(url)) {
      return {
        ok: false,
        error: "Link moet beginnen met http:// of https://",
        fieldErrors: { url: "Moet beginnen met http(s)://" },
      };
    }
  }

  await db.organization.update({
    where: { id: ctx.organization.id },
    data: {
      reviewRequestEnabled: parsed.data.enabled,
      reviewRequestUrl: url || null,
      reviewRequestDelayDays: parsed.data.delayDays,
    },
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "org.review-request.update",
    resource: "organization",
    resourceId: ctx.organization.id,
    metadata: {
      enabled: parsed.data.enabled,
      delayDays: parsed.data.delayDays,
      hasUrl: Boolean(url),
    },
  });

  revalidatePath("/dashboard/settings/organization");
  return { ok: true };
}
