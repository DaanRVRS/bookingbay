import { z } from "zod";

export const bookingStatusValues = [
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELED",
] as const;

const bookingBaseShape = {
  itemId: z.string().min(1, "Kies een item"),
  customerId: z.string().min(1, "Kies een klant"),
  startAt: z.coerce.date({ message: "Ongeldige startdatum" }),
  endAt: z.coerce.date({ message: "Ongeldige einddatum" }),
  status: z.enum(bookingStatusValues).default("CONFIRMED"),
  totalPrice: z.coerce
    .number({ message: "Vul een prijs in" })
    .nonnegative("Geen negatieve prijs"),
  notes: z.string().max(2000).optional().or(z.literal("")),
};

export const bookingCreateSchema = z
  .object(bookingBaseShape)
  .refine((d) => d.endAt > d.startAt, {
    message: "Einde moet ná start liggen",
    path: ["endAt"],
  });

export const bookingUpdateSchema = z
  .object({ ...bookingBaseShape, id: z.string().min(1) })
  .refine((d) => d.endAt > d.startAt, {
    message: "Einde moet ná start liggen",
    path: ["endAt"],
  });

export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
export type BookingUpdateInput = z.infer<typeof bookingUpdateSchema>;

export const STATUS_LABELS: Record<(typeof bookingStatusValues)[number], string> = {
  PENDING: "In afwachting",
  CONFIRMED: "Bevestigd",
  IN_PROGRESS: "Onderweg",
  COMPLETED: "Voltooid",
  CANCELED: "Geannuleerd",
};
