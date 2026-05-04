import { z } from "zod";

export const leadSchema = z.object({
  organizationId: z.string().min(1),
  itemId: z.string().optional().or(z.literal("")),
  name: z.string().min(2, "Naam te kort").max(120),
  email: z.email("Ongeldig e-mailadres"),
  phone: z.string().max(40).optional().or(z.literal("")),
  message: z.string().min(5, "Bericht te kort").max(2000),
  startAt: z.string().optional().or(z.literal("")),
  endAt: z.string().optional().or(z.literal("")),
});

export type LeadInput = z.infer<typeof leadSchema>;
