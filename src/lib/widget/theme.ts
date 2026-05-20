/**
 * Vrij instelbaar kleur-thema voor de boek-widget. Elk token mapt op een
 * CSS-variabele; door die op de widget-wrapper te zetten herthema-en
 * álle Tailwind-classes (bg-card, border-border, text-muted-foreground…)
 * én de inline var()-referenties automatisch mee — geen losse edits per
 * element nodig. Niet ingesteld = de app-default (var blijft ongezet).
 */

export const WIDGET_THEME_TOKENS = [
  {
    key: "bg",
    label: "Widget-achtergrond",
    cssVar: "--background",
    hint: "Het paneel waarop de widget staat",
  },
  {
    key: "card",
    label: "Kaarten",
    cssVar: "--card",
    hint: "Binnen-kaartjes (categorie, item, info)",
  },
  {
    key: "border",
    label: "Randen",
    cssVar: "--border",
    hint: "Lijnen en randen",
  },
  {
    key: "heading",
    label: "Koppen",
    cssVar: "--foreground",
    hint: "Titels en vette tekst",
  },
  {
    key: "text",
    label: "Tekst",
    cssVar: "--muted-foreground",
    hint: "Omschrijvingen en sublabels",
  },
  {
    key: "orgName",
    label: "Bedrijfsnaam",
    cssVar: "--bb-orgname",
    hint: "Je bedrijfsnaam in de kop",
  },
  {
    key: "buttonText",
    label: "Knoptekst",
    cssVar: "--bb-on-accent",
    hint: "Tekst op de accent-knoppen",
  },
  {
    key: "itemLink",
    label: "Item-link",
    cssVar: "--bb-item-link",
    hint: '"Boek dit item"-tekst & prijs',
  },
] as const;

export type WidgetThemeKey = (typeof WIDGET_THEME_TOKENS)[number]["key"];
export type WidgetTheme = Partial<Record<WidgetThemeKey, string>>;

export const WIDGET_THEME_KEYS = WIDGET_THEME_TOKENS.map(
  (t) => t.key,
) as WidgetThemeKey[];

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function normHex(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return HEX.test(s) ? s.toLowerCase() : null;
}

export function parseTheme(raw: unknown): WidgetTheme {
  const out: WidgetTheme = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    for (const tk of WIDGET_THEME_TOKENS) {
      const c = normHex(obj[tk.key]);
      if (c) out[tk.key] = c;
    }
  }
  return out;
}

/** Alleen de ingestelde tokens → CSS-variabelen. Spread in style={}. */
export function themeStyle(theme: WidgetTheme): Record<string, string> {
  const s: Record<string, string> = {};
  for (const tk of WIDGET_THEME_TOKENS) {
    const c = theme[tk.key];
    if (c) s[tk.cssVar] = c;
  }
  return s;
}

/* --------------------------- USP-iconen ---------------------------- */

export interface WidgetUsp {
  text: string;
  icon: string;
}

export const USP_ICON_KEYS = [
  "check",
  "star",
  "shield",
  "clock",
  "zap",
  "heart",
  "badge-check",
  "truck",
  "phone",
  "mail",
  "map-pin",
  "calendar",
  "credit-card",
  "gift",
  "sparkles",
  "thumbs-up",
  "leaf",
  "lock",
] as const;

export type UspIconKey = (typeof USP_ICON_KEYS)[number];

export function normUspIcon(v: unknown): UspIconKey {
  return typeof v === "string" && (USP_ICON_KEYS as readonly string[]).includes(v)
    ? (v as UspIconKey)
    : "check";
}

/** Tolerant: accepteert oude string[] én nieuwe { text, icon }[]. */
export function parseUsps(raw: unknown): WidgetUsp[] {
  if (!Array.isArray(raw)) return [];
  const out: WidgetUsp[] = [];
  for (const entry of raw) {
    if (typeof entry === "string") {
      const text = entry.trim();
      if (text) out.push({ text, icon: "check" });
    } else if (entry && typeof entry === "object") {
      const e = entry as Record<string, unknown>;
      const text = typeof e.text === "string" ? e.text.trim() : "";
      if (text) out.push({ text, icon: normUspIcon(e.icon) });
    }
    if (out.length >= 6) break;
  }
  return out;
}
