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
  // Eén prijs per verhuur-eenheid (de eenheid = bookingIntervalMinutes).
  pricePerUnit: decimal,
  deposit: decimal,
  cleaningFee: decimal,
  // 0 is alleen toegestaan voor add-ons en betekent "voorraad n.v.t." —
  // de refine hieronder dwingt min 1 af voor normale items.
  quantity: z.coerce.number().int().min(0).max(9999).default(1),
  isActive: z.coerce.boolean().default(true),
  // Add-on: dit item is een optionele extra (zwemvest, koelbox, schipper)
  // i.p.v. een zelfstandig boekbaar item. addonPrice = vaste prijs per stuk.
  isAddon: z.coerce.boolean().default(false),
  addonPrice: decimal,
  // Categorieën waarbij deze add-on aangeboden wordt. Null/leeg = overal.
  addonCategoryIds: z.array(z.string().min(1)).nullable().optional(),
  // Boek-slot configuratie én prijs-eenheid. 1440 = per-dag, 10080 = per-week
  // (beide verbergen de tijdkeuze in de widget).
  bookingIntervalMinutes: z.coerce
    .number()
    .int()
    .min(5)
    .max(10080)
    .default(60),
  // Window-grenzen in minuten vanaf middernacht. 540 = 09:00, 1080 = 18:00.
  bookingWindowStartMin: z.coerce.number().int().min(0).max(1440).default(540),
  bookingWindowEndMin: z.coerce.number().int().min(0).max(1440).default(1080),
  // Per-item override op de openingstijden. Null = volg organisatie.
  businessHoursOverride: businessHoursSchema.nullable().optional(),
};

const windowOrderRefine = (d: { bookingWindowStartMin: number; bookingWindowEndMin: number }) =>
  d.bookingWindowEndMin > d.bookingWindowStartMin;

// quantity 0 ("n.v.t.") mag alleen bij add-ons.
const quantityRefine = (d: { isAddon: boolean; quantity: number }) =>
  d.isAddon || d.quantity >= 1;

export const itemCreateSchema = z
  .object(itemBaseShape)
  .refine(windowOrderRefine, {
    message: "Eind-tijd moet na start-tijd liggen",
    path: ["bookingWindowEndMin"],
  })
  .refine(quantityRefine, {
    message: "Vul een aantal van minimaal 1 in",
    path: ["quantity"],
  });

export const itemUpdateSchema = z
  .object({ ...itemBaseShape, id: z.string().min(1) })
  .refine(windowOrderRefine, {
    message: "Eind-tijd moet na start-tijd liggen",
    path: ["bookingWindowEndMin"],
  })
  .refine(quantityRefine, {
    message: "Vul een aantal van minimaal 1 in",
    path: ["quantity"],
  });

export type ItemCreateInput = z.infer<typeof itemCreateSchema>;
export type ItemUpdateInput = z.infer<typeof itemUpdateSchema>;
