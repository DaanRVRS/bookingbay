import { z } from "zod";

export const categoryCreateSchema = z.object({
  name: z.string().min(1, "Naam is verplicht").max(80, "Te lang"),
  description: z.string().max(500).optional().or(z.literal("")),
  imageUrl: z.string().optional().or(z.literal("")).nullable(),
  parentId: z.string().optional().nullable(),
});

export const categoryUpdateSchema = categoryCreateSchema.extend({
  id: z.string().min(1),
});

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
