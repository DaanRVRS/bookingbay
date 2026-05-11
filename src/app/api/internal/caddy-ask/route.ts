import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Caddy on-demand-TLS "ask" endpoint.
 *
 * Caddy belt deze URL voordat het een Let's Encrypt-certificaat probeert
 * te halen voor een host. We reageren 200 als de host een geverifieerde
 * custom-domain in de DB is — anders 4xx. Voorkomt dat random hosts
 * cert-aanvragen kunnen triggeren tegen onze rate-limit.
 *
 * Caddyfile snippet:
 *
 *   {
 *     on_demand_tls {
 *       ask http://localhost:3001/api/internal/caddy-ask?token=YOUR_TOKEN
 *     }
 *   }
 *
 *   :443 {
 *     tls {
 *       on_demand
 *     }
 *     reverse_proxy localhost:3001
 *   }
 *
 * Caddy stuurt de aangevraagde hostname automatisch mee als `?domain=…`
 * query-param.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const domain = url.searchParams.get("domain")?.toLowerCase().trim();
  const token = url.searchParams.get("token") ?? "";

  // Token-check als CADDY_ASK_TOKEN ingesteld is — anders alles weigeren
  // behalve lokale dev.
  if (env.CADDY_ASK_TOKEN) {
    if (token !== env.CADDY_ASK_TOKEN) {
      return new NextResponse("forbidden", { status: 403 });
    }
  } else if (env.NODE_ENV === "production") {
    return new NextResponse("CADDY_ASK_TOKEN not configured", { status: 503 });
  }

  if (!domain) {
    return new NextResponse("missing domain", { status: 400 });
  }

  // Apex hosts (root domain, tenant domain) zijn standaard toegestaan —
  // Caddy mag voor onze eigen hosts altijd een cert halen.
  const platformHosts = [
    env.ROOT_DOMAIN.split(":")[0].toLowerCase(),
    env.TENANT_DOMAIN.split(":")[0].toLowerCase(),
    env.CUSTOM_DOMAIN_CNAME_TARGET.toLowerCase(),
  ].filter(Boolean);
  if (
    platformHosts.some(
      (h) => domain === h || domain.endsWith("." + h),
    )
  ) {
    return new NextResponse("ok", { status: 200 });
  }

  // Check of het een geverifieerd custom-domein is.
  const org = await db.organization.findUnique({
    where: { customDomain: domain },
    select: { customDomainVerifiedAt: true },
  });
  if (!org?.customDomainVerifiedAt) {
    return new NextResponse("not verified", { status: 404 });
  }
  return new NextResponse("ok", { status: 200 });
}
