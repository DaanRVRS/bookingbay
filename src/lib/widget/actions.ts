"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth/session";
import { audit } from "@/lib/audit/log";
import type { ActionResult } from "@/lib/auth/schemas";
import { blockDemoWrite } from "@/lib/demo/guard";
import { WIDGET_THEME_KEYS, normUspIcon } from "@/lib/widget/theme";

const WIDGET_LOCALE_CODES = [
  "nl",
  "en",
  "fr",
  "de",
  "es",
  "it",
  "ru",
  "uk",
  "pl",
  "tr",
] as const;

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Ongeldige hex-kleur");

const widgetDesignSchema = z.object({
  accent: z
    .string()
    .regex(/^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/, "Ongeldige hex-kleur")
    .nullable()
    .optional(),
  width: z.enum(["400", "600", "800", "100%"]),
  radius: z.coerce.number().int().min(0).max(48),
  shadow: z.coerce.boolean(),
  usps: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(60),
        icon: z.string(),
      }),
    )
    .max(6)
    .optional()
    .default([]),
  tagline: z.string().trim().max(80).nullable().optional(),
  defaultLocale: z.enum(WIDGET_LOCALE_CODES).optional().default("nl"),
  theme: z.record(z.string(), hexColor).optional().default({}),
});

export type WidgetDesignInput = z.infer<typeof widgetDesignSchema>;

export async function saveWidgetDesignAction(
  input: WidgetDesignInput,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  // Iedere rol met dashboard-toegang kan widget-design wijzigen. Eventueel
  // later achter een aparte permissie zetten.
  const demoBlocked = blockDemoWrite(ctx);
  if (demoBlocked) return demoBlocked;

  const parsed = widgetDesignSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer" };
  }

  const normalizedAccent = parsed.data.accent
    ? parsed.data.accent.startsWith("#")
      ? parsed.data.accent
      : `#${parsed.data.accent}`
    : null;

  const usps = (parsed.data.usps ?? [])
    .map((u) => ({ text: u.text.trim(), icon: normUspIcon(u.icon) }))
    .filter((u) => u.text.length > 0)
    .slice(0, 6);
  const tagline = parsed.data.tagline?.trim() || null;
  // Alleen bekende thema-tokens bewaren.
  const rawTheme = parsed.data.theme ?? {};
  const theme: Record<string, string> = {};
  for (const k of WIDGET_THEME_KEYS) {
    const v = rawTheme[k];
    if (typeof v === "string") theme[k] = v;
  }

  await db.organization.update({
    where: { id: ctx.organization.id },
    data: {
      widgetAccent: normalizedAccent,
      widgetWidth: parsed.data.width,
      widgetRadius: parsed.data.radius,
      widgetShadow: parsed.data.shadow,
      widgetUsps: usps,
      widgetTagline: tagline,
      widgetDefaultLocale: parsed.data.defaultLocale ?? "nl",
      widgetTheme: theme,
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
      usps: usps.length,
      tagline: Boolean(tagline),
      defaultLocale: parsed.data.defaultLocale ?? "nl",
      themeKeys: Object.keys(theme),
    },
  });

  revalidatePath("/dashboard/widgets");
  // /book en de embed-page draaien op een ISR-cache van 60s — direct
  // invalideren zodat klanten wijzigingen meteen zien i.p.v. binnen
  // een minuut.
  revalidatePath(`/book/${ctx.organization.slug}`);
  revalidatePath(`/site/${ctx.organization.slug}/embed/book`);
  return { ok: true };
}
