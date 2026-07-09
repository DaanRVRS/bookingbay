import { z } from "zod";

const hexOrEmpty = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/i, "Gebruik hex (bv. #ef5934)")
  .or(z.literal(""));

// Kleuren per site-onderdeel. Leeg veld = standaard thema voor dat
// onderdeel, dus tenants hoeven alleen in te vullen wat ze willen afwijken.
export const siteThemeSchema = z.object({
  headerBg: hexOrEmpty.default(""),
  headerText: hexOrEmpty.default(""),
  footerBg: hexOrEmpty.default(""),
  footerText: hexOrEmpty.default(""),
  pageBg: hexOrEmpty.default(""),
});

export type SiteTheme = z.infer<typeof siteThemeSchema>;

export const EMPTY_SITE_THEME: SiteTheme = {
  headerBg: "",
  headerText: "",
  footerBg: "",
  footerText: "",
  pageBg: "",
};

/** Onbekende/oude JSON-shapes veilig naar een SiteTheme — nooit throwen. */
export function safeParseSiteTheme(value: unknown): SiteTheme {
  const parsed = siteThemeSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : EMPTY_SITE_THEME;
}

// Hero-titel / -subtitel / "Over ons"-tekst zijn verhuisd naar de
// page-builder (homepagina). Hier alleen nog de globale brand-instellingen
// die op meerdere plekken nodig zijn (mail-headers, tenant-footer, etc.).
export const siteCustomizerSchema = z.object({
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/i, "Gebruik hex (bv. #ef5934)")
    .optional()
    .or(z.literal("")),
  logoUrl: z.string().optional().or(z.literal("")).nullable(),
  contactEmail: z.email("Ongeldig e-mailadres").optional().or(z.literal("")),
  contactPhone: z.string().max(40).optional().or(z.literal("")),
  // Bedrijfsgegevens — optioneel; wat ingevuld is verschijnt in de footer.
  businessAddress: z.string().max(160).optional().or(z.literal("")),
  businessPostcode: z.string().max(12).optional().or(z.literal("")),
  businessCity: z.string().max(80).optional().or(z.literal("")),
  kvkNumber: z.string().max(20).optional().or(z.literal("")),
  vatNumber: z.string().max(24).optional().or(z.literal("")),
  itemDisplayStyle: z.enum(["GRID", "LIST"]).default("GRID"),
  theme: siteThemeSchema.default(EMPTY_SITE_THEME),
});

export type SiteCustomizerInput = z.infer<typeof siteCustomizerSchema>;
