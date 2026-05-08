import { z } from "zod";

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
  itemDisplayStyle: z.enum(["GRID", "LIST"]).default("GRID"),
});

export type SiteCustomizerInput = z.infer<typeof siteCustomizerSchema>;
