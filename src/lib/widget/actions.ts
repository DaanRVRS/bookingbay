"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth/session";
import { audit } from "@/lib/audit/log";
import type { ActionResult } from "@/lib/auth/schemas";

const widgetDesignSchema = z.object({
  accent: z
    .string()
    .regex(/^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/, "Ongeldige hex-kleur")
    .nullable()
    .optional(),
  width: z.enum(["400", "600", "800", "100%"]),
  radius: z.coerce.number().int().min(0).max(48),
  shadow: z.coerce.boolean(),
});

export type WidgetDesignInput = z.infer<typeof widgetDesignSchema>;

export async function saveWidgetDesignAction(
  input: WidgetDesignInput,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  // Iedere rol met dashboard-toegang kan widget-design wijzigen. Eventueel
  // later achter een aparte permissie zetten.

  const parsed = widgetDesignSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer" };
  }

  const normalizedAccent = parsed.data.accent
    ? parsed.data.accent.startsWith("#")
      ? parsed.data.accent
      : `#${parsed.data.accent}`
    : null;

  await db.organization.update({
    where: { id: ctx.organization.id },
    data: {
      widgetAccent: normalizedAccent,
      widgetWidth: parsed.data.width,
      widgetRadius: parsed.data.radius,
      widgetShadow: parsed.data.shadow,
    },
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "widget.design.update",
    resource: "organization",
    resourceId: ctx.organization.id,
    metadata: {
      accent: normalizedAccent,
      width: parsed.data.width,
      radius: parsed.data.radius,
      shadow: parsed.data.shadow,
    },
  });

  revalidatePath("/dashboard/widgets");
  return { ok: true };
}
