/**
 * WCAG-contrastberekening voor tekst op een (tenant-)accentkleur. Client- en
 * server-safe, geen dependencies.
 *
 * Gebruikt om automatisch donkere knoptekst te kiezen zodra witte tekst op
 * de gekozen accentkleur onder de AA-drempel (4,5:1) komt — anders is de
 * "Boeken"-knop voor slechtzienden onleesbaar.
 */

export const WCAG_AA_TEXT = 4.5;

/** Donkere tekstkleur (zelfde navy als de body-tekst in mails). */
export const DARK_ON_ACCENT = "#1a2238";
export const LIGHT_ON_ACCENT = "#ffffff";

function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.trim().replace(/^#/, "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channelToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** Relatieve luminantie (WCAG 2.x) van een hex-kleur, of null bij ongeldige hex. */
export function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map(channelToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrastratio tussen twee hex-kleuren (1..21), of null bij ongeldige invoer. */
export function contrastRatio(a: string, b: string): number | null {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la == null || lb == null) return null;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Tekstkleur voor op een accent-achtergrond: wit als dat ≥ 4,5:1 haalt,
 * anders donker. Ongeldige hex → wit (zelfde gedrag als voorheen).
 */
export function onAccentColor(accentHex: string): string {
  const ratio = contrastRatio(LIGHT_ON_ACCENT, accentHex);
  if (ratio == null) return LIGHT_ON_ACCENT;
  return ratio >= WCAG_AA_TEXT ? LIGHT_ON_ACCENT : DARK_ON_ACCENT;
}
