import { z } from "zod";

export const customerCreateSchema = z.object({
  name: z.string().min(1, "Naam is verplicht").max(120, "Te lang"),
  email: z.email("Ongeldig e-mailadres").optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export const customerUpdateSchema = customerCreateSchema.extend({
  id: z.string().min(1),
});

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
