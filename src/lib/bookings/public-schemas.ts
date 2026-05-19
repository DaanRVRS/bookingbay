import { z } from "zod";

export const publicBookingSchema = z
  .object({
    slug: z.string().min(1),
    itemId: z.string().min(1, "Kies een item"),
    startAt: z.string().min(1, "Vul een startdatum in"),
    endAt: z.string().min(1, "Vul een einddatum in"),
    customerName: z.string().min(2, "Naam te kort").max(120),
    customerEmail: z.email("Ongeldig e-mailadres"),
    customerPhone: z.string().max(40).optional().or(z.literal("")),
    notes: z.string().max(2000).optional().or(z.literal("")),
    // Hoe de klant wil betalen. "online" = direct via tenant's Mollie/Stripe;
    // alles anders (incl. afwezig) = "location" → bij ophalen, booking PENDING.
    paymentChoice: z.enum(["location", "online"]).optional(),
  })
  .refine(
    (d) => {
      const s = new Date(d.startAt);
      const e = new Date(d.endAt);
      return !Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime());
    },
    { message: "Ongeldige datum", path: ["startAt"] },
  )
  .refine(
    (d) => new Date(d.endAt) > new Date(d.startAt),
    { message: "Einde moet ná start liggen", path: ["endAt"] },
  );

export type PublicBookingInput = z.infer<typeof publicBookingSchema>;
