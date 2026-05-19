import "server-only";
import { normalizeLocale } from "@/lib/widget/i18n";
import {
  parseUsps,
  parseTheme,
  type WidgetUsp,
  type WidgetTheme,
} from "@/lib/widget/theme";

/**
 * Eén plek die de widget-stijl bepaalt voor zowel /book als de embed,
 * zodat het dashboard-voorbeeld (iframe van /book) gegarandeerd 1-op-1
 * is met wat bezoekers zien. Opgeslagen org-velden zijn leidend; in
 * preview-modus mogen query-params ze tijdelijk overschrijven zodat de
 * customizer live meebeweegt vóór de debounce-save klaar is.
 */
export interface ResolvedWidgetDesign {
  accent: string;
  radius: number;
  shadow: boolean;
  usps: WidgetUsp[];
  tagline: string | null;
  defaultLocale: string;
  theme: WidgetTheme;
}

interface OrgDesignFields {
  primaryColor: string | null;
  widgetAccent: string | null;
  widgetRadius: number;
  widgetShadow: boolean;
  widgetUsps: unknown;
  widgetTagline: string | null;
  widgetDefaultLocale: string;
  widgetTheme: unknown;
}

const FALLBACK_ACCENT = "#ef5934";

function normalizeAccent(
  input: string | null | undefined,
  fallback: string,
): string {
  if (!input) return fallback;
  const cleaned = input.replace(/^#/, "").trim();
  if (/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(cleaned)) return `#${cleaned}`;
  return fallback;
}

export function resolveWidgetDesign(
  org: OrgDesignFields,
  sp: Record<string, string | undefined>,
): ResolvedWidgetDesign {
  const orgAccent = normalizeAccent(
    org.widgetAccent ?? org.primaryColor,
    FALLBACK_ACCENT,
  );

  // Preview-overrides (alleen relevant in het dashboard-voorbeeld).
  const accent = sp.accent
    ? normalizeAccent(sp.accent, orgAccent)
    : orgAccent;

  const radius =
    sp.radius !== undefined && /^\d{1,2}$/.test(sp.radius)
      ? Math.min(48, Number(sp.radius))
      : org.widgetRadius;

  const shadow =
    sp.shadow !== undefined ? sp.shadow === "1" : org.widgetShadow;

  const usps = parseUsps(org.widgetUsps);

  const tagline =
    sp.tagline !== undefined
      ? decodeURIComponent(sp.tagline).trim() || null
      : (org.widgetTagline?.trim() || null);

  const defaultLocale = normalizeLocale(
    sp.lang ?? org.widgetDefaultLocale,
  );

  const theme = parseTheme(org.widgetTheme);

  return { accent, radius, shadow, usps, tagline, defaultLocale, theme };
}
