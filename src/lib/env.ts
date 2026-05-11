import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  AUTH_TRUST_HOST: z
    .union([z.literal("true"), z.literal("false"), z.literal("1"), z.literal("0")])
    .optional()
    .default("false"),
  // Email — pick ONE provider. Falls back to console-log when none set.
  // SMTP (Zoho, Postmark, AWS SES, Mailgun via SMTP, etc.):
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().int().optional().default(587),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  SMTP_SECURE: z
    .union([z.literal("true"), z.literal("false"), z.literal("1"), z.literal("0")])
    .optional()
    .default("false"),
  // Resend (alternative — keeps working if you switch back):
  RESEND_API_KEY: z.string().optional().default(""),
  // Sender address used by all outgoing mail. Falls back to RESEND_FROM
  // for backwards-compat with earlier .env.production files.
  EMAIL_FROM: z.string().optional().default(""),
  RESEND_FROM: z.string().optional().default("BookingBay <noreply@example.com>"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Optional overrides — fall back to NEXTAUTH_URL / its host
  APP_URL: z.string().url().optional(),
  ROOT_DOMAIN: z.string().optional(),
  // Suffix below which tenant subdomains live. For prod (nip.io) this is
  // the same as the admin host (admin = bookingbay.<ip>.nip.io, tenants
  // = <slug>.bookingbay.<ip>.nip.io). For dev: lvh.me:3001.
  TENANT_DOMAIN: z.string().optional(),
  // Shared secret expected in the Authorization header on /api/cron/* hits.
  // System cron / external scheduler must send: Authorization: Bearer <CRON_SECRET>
  CRON_SECRET: z.string().optional().default(""),
  // Het host-adres waar klanten een CNAME naartoe moeten zetten voor hun
  // custom-domein. Default = TENANT_DOMAIN (b.v. "bookingbay.nl"). Overschrijf
  // alleen als je een dedicated edge-host hebt (b.v. "edge.bookingbay.nl").
  CUSTOM_DOMAIN_CNAME_TARGET: z.string().optional().default(""),
  // Interne shared-secret die Caddy meestuurt bij de on-demand-TLS ask:
  // GET /api/internal/caddy-ask?domain=...  → 200 als toegestaan. Voorkomt
  // dat random hosts cert-requests triggeren.
  CADDY_ASK_TOKEN: z.string().optional().default(""),
  // Discord webhooks — separate channels for support en CRM, met een
  // optionele generieke fallback voor setups die alles in één kanaal willen.
  //  - DISCORD_WEBHOOK_URL_SUPPORT: tickets + replies
  //  - DISCORD_WEBHOOK_URL_CRM:     leads, signups, payment-issues, prospect-events
  //  - DISCORD_WEBHOOK_URL:         fallback voor beide bij ontbrekende waarde
  // Get one via Server Settings → Integrations → Webhooks in Discord. Empty
  // = silently skip (in dev wordt het payload-object naar console gelogd).
  DISCORD_WEBHOOK_URL: z.string().url().optional().or(z.literal("")).default(""),
  DISCORD_WEBHOOK_URL_SUPPORT: z.string().url().optional().or(z.literal("")).default(""),
  DISCORD_WEBHOOK_URL_CRM: z.string().url().optional().or(z.literal("")).default(""),
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

// Resolve the actual sender address — EMAIL_FROM > RESEND_FROM > default
const emailFrom = data.EMAIL_FROM || data.RESEND_FROM || "BookingBay <noreply@example.com>";

// Tenant subdomains live below the apex host. If the admin runs on
// www.bookingbay.nl we must NOT prepend the slug to "www.bookingbay.nl"
// (that gives reuvers.www.bookingbay.nl which doesn't resolve). Strip the
// "www." prefix so tenants land at <slug>.bookingbay.nl. An explicit
// TENANT_DOMAIN env var still wins.
const stripWww = (host: string) => host.replace(/^www\./i, "");
const tenantDomain = data.TENANT_DOMAIN || stripWww(rootDomain);

// CNAME-doel voor klanten met custom-domein. Default = TENANT_DOMAIN
// (gestript van eventueel poortnummer voor productie).
const cnameTarget =
  data.CUSTOM_DOMAIN_CNAME_TARGET || tenantDomain.split(":")[0];

export const env = {
  ...data,
  APP_URL: baseUrl,
  ROOT_DOMAIN: rootDomain,
  TENANT_DOMAIN: tenantDomain,
  CUSTOM_DOMAIN_CNAME_TARGET: cnameTarget,
  EMAIL_FROM: emailFrom,
};
