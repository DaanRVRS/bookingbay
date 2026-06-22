import { z } from "zod";

const slugRegex = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;
const reservedSlugs = new Set([
  "app",
  "api",
  "www",
  "admin",
  "dashboard",
  "login",
  "register",
  "auth",
  "static",
  "assets",
  "public",
  "support",
  "help",
  "docs",
  "blog",
  "mail",
  "billing",
  // Gelijkgetrokken met de lijst in settings/actions.ts — deze botsen met
  // bestaande routes/subdomeinen en mochten bij aanmaken niet ontbreken.
  "uploads",
  "site",
  "embed",
  "invite",
]);

export const slugSchema = z
  .string()
  .min(3, "Min. 3 tekens")
  .max(40, "Max. 40 tekens")
  .regex(slugRegex, "Alleen kleine letters, cijfers, en streepjes")
  .refine((s) => !reservedSlugs.has(s), { message: "Deze slug is gereserveerd" });

export const INDUSTRIES = [
  { value: "boats", label: "Watersport (boten, sloepen)" },
  { value: "bikes", label: "Fietsen & e-bikes" },
  { value: "cars", label: "Auto's & busjes" },
  { value: "tools", label: "Gereedschap" },
  { value: "events", label: "Party & event" },
  { value: "outdoor", label: "Outdoor & camping" },
  { value: "other", label: "Iets anders" },
] as const;

export const onboardingSchema = z.object({
  name: z.string().min(2, "Te kort").max(80, "Te lang"),
  slug: slugSchema,
  industry: z.enum(INDUSTRIES.map((i) => i.value) as [string, ...string[]]),
  firstCategory: z.string().min(2, "Te kort").max(60, "Te lang"),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export function suggestSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
