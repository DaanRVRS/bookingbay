import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  AUTH_TRUST_HOST: z
    .union([z.literal("true"), z.literal("false"), z.literal("1"), z.literal("0")])
    .optional()
    .default("false"),
  RESEND_API_KEY: z.string().optional().default(""),
  RESEND_FROM: z.string().optional().default("BookingBay <noreply@example.com>"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Optional overrides — fall back to NEXTAUTH_URL / its host
  APP_URL: z.string().url().optional(),
  ROOT_DOMAIN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment variables:", z.treeifyError(parsed.error));
  throw new Error("Invalid environment variables");
}

const data = parsed.data;
const baseUrl = (data.APP_URL ?? data.NEXTAUTH_URL).replace(/\/$/, "");

let rootDomain = data.ROOT_DOMAIN;
if (!rootDomain) {
  try {
    const u = new URL(baseUrl);
    rootDomain = u.host;
  } catch {
    rootDomain = "lvh.me:3001";
  }
}

export const env = {
  ...data,
  APP_URL: baseUrl,
  ROOT_DOMAIN: rootDomain,
};
