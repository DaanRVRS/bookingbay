import { z } from "zod";

export const reviewCreateSchema = z.object({
  quote: z.string().min(2, "Citaat is te kort").max(1000, "Te lang"),
  author: z.string().min(1, "Auteur is verplicht").max(80),
  role: z.string().max(120).default(""),
  rating: z
    .union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
    ])
    .default(5),
  isPublished: z.boolean().default(true),
});

export const reviewUpdateSchema = reviewCreateSchema.extend({
  id: z.string().min(1),
});

export const reviewReorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>;
export type ReviewUpdateInput = z.infer<typeof reviewUpdateSchema>;
