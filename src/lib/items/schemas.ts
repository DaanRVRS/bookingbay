import { z } from "zod";

const decimal = z
  .union([z.string(), z.number()])
  .optional()
  .nullable()
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    if (Number.isNaN(n) || n < 0) return null;
    return n;
  });

export const itemCreateSchema = z.object({
  name: z.string().min(1, "Naam is verplicht").max(120, "Te lang"),
  description: z.string().max(2000).optional().or(z.literal("")),
  categoryId: z.string().min(1, "Kies een categorie"),
  imageUrl: z.string().url().optional().or(z.literal("")).nullable(),
  pricePerHour: decimal,
  pricePerDay: decimal,
  pricePerWeek: decimal,
  deposit: decimal,
  quantity: z.coerce.number().int().min(1).max(9999).default(1),
  isActive: z.coerce.boolean().default(true),
});

export const itemUpdateSchema = itemCreateSchema.extend({
  id: z.string().min(1),
});

export type ItemCreateInput = z.infer<typeof itemCreateSchema>;
export type ItemUpdateInput = z.infer<typeof itemUpdateSchema>;
