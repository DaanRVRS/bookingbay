import { z } from "zod";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const dayHoursSchema = z.object({
  closed: z.boolean().default(false),
  // "HH:MM" 24h. Genegeerd als closed = true.
  open: z
    .string()
    .regex(HHMM, "Ongeldige tijd (HH:MM)")
    .or(z.literal(""))
    .default("09:00"),
  close: z
    .string()
    .regex(HHMM, "Ongeldige tijd (HH:MM)")
    .or(z.literal(""))
    .default("17:00"),
});

export const businessHoursSchema = z.array(dayHoursSchema).length(7);

export type DayHours = z.infer<typeof dayHoursSchema>;
export type BusinessHours = z.infer<typeof businessHoursSchema>;

export const DAY_LABELS_NL: readonly string[] = [
  "Maandag",
  "Dinsdag",
  "Woensdag",
  "Donderdag",
  "Vrijdag",
  "Zaterdag",
  "Zondag",
];

export function defaultBusinessHours(): BusinessHours {
  return [
    { closed: false, open: "09:00", close: "17:00" },
    { closed: false, open: "09:00", close: "17:00" },
    { closed: false, open: "09:00", close: "17:00" },
    { closed: false, open: "09:00", close: "17:00" },
    { closed: false, open: "09:00", close: "17:00" },
    { closed: false, open: "10:00", close: "16:00" },
    { closed: true, open: "", close: "" },
  ];
}

/** Veilige parse: ongeldige data → null. */
export function safeParseBusinessHours(input: unknown): BusinessHours | null {
  if (input == null) return null;
  const r = businessHoursSchema.safeParse(input);
  return r.success ? r.data : null;
}
