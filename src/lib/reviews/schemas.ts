import { z } from "zod";

// Datum (yyyy-mm-dd) waarop de verhuurder toestemming van de genoemde
// persoon heeft ontvangen om de review met naam te tonen. Verplicht: zonder
// vastgelegde toestemming mag een review met naam niet gepubliceerd worden
// (AVG art. 6/7, art. 6:193j BW).
const consentDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Vul de datum in waarop je toestemming ontving")
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.getTime() <= Date.now() + 24 * 60 * 60 * 1000;
  }, "Ongeldige datum (mag niet in de toekomst liggen)");

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
  consentReceivedAt: consentDate,
});

export const reviewUpdateSchema = reviewCreateSchema.extend({
  id: z.string().min(1),
});

export const reviewReorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>;
export type ReviewUpdateInput = z.infer<typeof reviewUpdateSchema>;
