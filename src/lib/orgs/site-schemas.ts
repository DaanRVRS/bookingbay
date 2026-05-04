import { z } from "zod";

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
