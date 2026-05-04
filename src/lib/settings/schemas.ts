import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Naam te kort").max(80, "Te lang"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Verplicht"),
  newPassword: z
    .string()
    .min(8, "Minimaal 8 tekens")
    .max(128)
    .regex(/[A-Z]/, "Minstens één hoofdletter")
    .regex(/[a-z]/, "Minstens één kleine letter")
    .regex(/[0-9]/, "Minstens één cijfer"),
});

export const updateOrgSchema = z.object({
  name: z.string().min(2, "Naam te kort").max(80, "Te lang"),
  slug: z
    .string()
    .min(3, "Min. 3 tekens")
    .max(40, "Max. 40 tekens")
    .regex(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/, "Alleen kleine letters, cijfers en streepjes"),
  industry: z.string().max(40).optional().or(z.literal("")),
});

export const deleteOrgSchema = z.object({
  confirmation: z.string().min(1, "Typ de naam ter bevestiging"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateOrgInput = z.infer<typeof updateOrgSchema>;
export type DeleteOrgInput = z.infer<typeof deleteOrgSchema>;
