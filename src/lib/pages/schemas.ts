import { z } from "zod";
import { blocksSchema } from "./blocks";

const slugSchema = z
  .string()
  .min(1, "Slug is verplicht")
  .max(60, "Te lang")
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Alleen kleine letters, cijfers en streepjes");

const titleSchema = z.string().min(1, "Titel is verplicht").max(120, "Te lang");

export const pageCreateSchema = z.object({
  title: titleSchema,
  slug: slugSchema,
});

export const pageMetaUpdateSchema = z.object({
  id: z.string().min(1),
  title: titleSchema,
  slug: slugSchema,
  isPublished: z.boolean().default(true),
  showInNav: z.boolean().default(true),
});

export const pageBlocksUpdateSchema = z.object({
  id: z.string().min(1),
  blocks: blocksSchema,
});

export type PageCreateInput = z.infer<typeof pageCreateSchema>;
export type PageMetaUpdateInput = z.infer<typeof pageMetaUpdateSchema>;
export type PageBlocksUpdateInput = z.infer<typeof pageBlocksUpdateSchema>;

// Slugs that must not collide with existing tenant routes.
// "contact" is bewust NIET gereserveerd: de ingebouwde /contact-route geeft
// voorrang aan een eigen gepubliceerde "contact"-pagina en valt anders terug
// op het standaard contactformulier.
export const RESERVED_SLUGS = new Set([
  "",
  "home",
  "item",
  "items",
  "api",
  "search",
  "embed",
  "_next",
]);
