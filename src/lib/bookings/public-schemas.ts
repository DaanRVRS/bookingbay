import { z } from "zod";

export const publicBookingSchema = z
  .object({
    slug: z.string().min(1),
    itemId: z.string().min(1, "Kies een item"),
    startAt: z.string().min(1, "Vul een startdatum in"),
    endAt: z.string().min(1, "Vul een einddatum in"),
    customerName: z.string().min(2, "Naam te kort").max(120),
    customerEmail: z.email("Ongeldig e-mailadres"),
    customerPhone: z
      .string()
      .trim()
      .min(5, "Telefoonnummer is verplicht")
      .max(40, "Telefoonnummer te lang"),
    notes: z.string().max(2000).optional().or(z.literal("")),
    // Hoe de klant wil betalen. "online" = direct via tenant's Mollie/Stripe;
    // alles anders (incl. afwezig) = "location" → bij ophalen, booking PENDING.
    paymentChoice: z.enum(["location", "online"]).optional(),
    // Gekozen add-ons (extra's): itemId + aantal. Prijs + naam worden
    // server-side opgehaald uit het add-on-item (nooit van de client
    // vertrouwen). Leeg/afwezig = geen extra's.
    addons: z
      .array(
        z.object({
          itemId: z.string().min(1),
          quantity: z.number().int().min(1).max(99),
        }),
      )
      .optional(),
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
