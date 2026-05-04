import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Naam te kort").max(80),
  email: z.email("Ongeldig e-mailadres"),
  password: z
    .string()
    .min(8, "Minimaal 8 tekens")
    .max(128, "Te lang")
    .regex(/[A-Z]/, "Minstens één hoofdletter")
    .regex(/[a-z]/, "Minstens één kleine letter")
    .regex(/[0-9]/, "Minstens één cijfer"),
});

export const loginSchema = z.object({
  email: z.email("Ongeldig e-mailadres"),
  password: z.string().min(1, "Verplicht"),
});

export const forgotPasswordSchema = z.object({
  email: z.email("Ongeldig e-mailadres"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z
    .string()
    .min(8, "Minimaal 8 tekens")
    .max(128)
    .regex(/[A-Z]/, "Minstens één hoofdletter")
    .regex(/[a-z]/, "Minstens één kleine letter")
    .regex(/[0-9]/, "Minstens één cijfer"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
