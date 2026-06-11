import { z } from "zod";
import { businessHoursSchema } from "@/lib/business-hours/schemas";

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

const itemBaseShape = {
  name: z.string().min(1, "Naam is verplicht").max(120, "Te lang"),
  description: z.string().max(2000).optional().or(z.literal("")),
  categoryId: z.string().min(1, "Kies een categorie"),
  // Accepts both absolute URLs (https://…) and relative server paths
  // like /api/uploads/<orgId>/<file>.webp returned by uploadItemImageAction.
  imageUrl: z.string().max(2048).optional().or(z.literal("")).nullable(),
  pricePerHour: decimal,
  pricePerDay: decimal,
  pricePerWeek: decimal,
  deposit: decimal,
  cleaningFee: decimal,
  quantity: z.coerce.number().int().min(1).max(9999).default(1),
  isActive: z.coerce.boolean().default(true),
  // Add-on: dit item is een optionele extra (zwemvest, koelbox, schipper)
  // i.p.v. een zelfstandig boekbaar item. addonPrice = vaste prijs per stuk.
  isAddon: z.coerce.boolean().default(false),
  addonPrice: decimal,
  // Boek-slot configuratie. 1440 = per-dag (verbergt tijdkeuze in widget).
  bookingIntervalMinutes: z.coerce
    .number()
    .int()
    .min(5)
    .max(1440)
    .default(60),
  // Window-grenzen in minuten vanaf middernacht. 540 = 09:00, 1080 = 18:00.
  bookingWindowStartMin: z.coerce.number().int().min(0).max(1440).default(540),
  bookingWindowEndMin: z.coerce.number().int().min(0).max(1440).default(1080),
  // Per-item override op de openingstijden. Null = volg organisatie.
  businessHoursOverride: businessHoursSchema.nullable().optional(),
};

const windowOrderRefine = (d: { bookingWindowStartMin: number; bookingWindowEndMin: number }) =>
  d.bookingWindowEndMin > d.bookingWindowStartMin;

export const itemCreateSchema = z
  .object(itemBaseShape)
  .refine(windowOrderRefine, {
    message: "Eind-tijd moet na start-tijd liggen",
    path: ["bookingWindowEndMin"],
  });

export const itemUpdateSchema = z
  .object({ ...itemBaseShape, id: z.string().min(1) })
  .refine(windowOrderRefine, {
    message: "Eind-tijd moet na start-tijd liggen",
    path: ["bookingWindowEndMin"],
  });

export type ItemCreateInput = z.infer<typeof itemCreateSchema>;
export type ItemUpdateInput = z.infer<typeof itemUpdateSchema>;
