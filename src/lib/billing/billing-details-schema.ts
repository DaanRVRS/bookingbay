import { z } from "zod";

/**
 * Validatie van de facturatiegegevens (client + server). Los van de
 * "use server"-actie, omdat een server-actions-bestand alleen async
 * functies mag exporteren.
 */
export const billingDetailsSchema = z.object({
  companyName: z.string().trim().min(2, "Bedrijfsnaam is verplicht").max(160),
  address: z.string().trim().min(2, "Adres is verplicht").max(160),
  postcode: z.string().trim().min(4, "Postcode is verplicht").max(12),
  city: z.string().trim().min(2, "Plaats is verplicht").max(80),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Landcode van 2 letters (bv. NL)"),
  email: z.email("Ongeldig e-mailadres").max(200).or(z.literal("")),
  vatNumber: z.string().trim().max(24).or(z.literal("")),
});

export type BillingDetailsInput = z.infer<typeof billingDetailsSchema>;
