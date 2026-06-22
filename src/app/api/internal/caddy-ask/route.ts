import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { timingSafeEqualStr } from "@/lib/security/timing-safe";

export const dynamic = "force-dynamic";

/**
 * Caddy on-demand-TLS "ask" endpoint.
 *
 * Caddy belt deze URL voordat het een Let's Encrypt-certificaat probeert
 * te halen voor een host. We reageren 200 alleen voor hosts die we ECHT
 * bedienen — anders 4xx.
 *
 * KRITIEK (incident 2026-06-03): de vorige versie deed `domain.endsWith(
 * ".bookingbay.nl")` en stond daarmee ELK subdomein toe. Bots vroegen
 * massaal random subdomeinen aan (`whm.<junk>.aquasloep.bookingbay.nl`),
 * Caddy haalde voor elk een cert → 111k certs → Caddy ge-OOM-killed →
 * site dagen plat. Nu staan we alléén toe:
 *   1. de exacte platform-apex hosts (+ www),
 *   2. <slug>.<tenantDomain> waarbij <slug> één label is én een bestaande
 *      organisatie, en
 *   3. geverifieerde custom-domeinen.
 * Al het andere (multi-level junk, onbekende slugs) → 404, geen cert.
 *
 * Caddyfile snippet:
 *   { on_demand_tls { ask http://localhost:3001/api/internal/caddy-ask?token=YOUR_TOKEN } }
 *   :443 { tls { on_demand } reverse_proxy localhost:3001 }
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const domain = url.searchParams.get("domain")?.toLowerCase().trim();
  const token = url.searchParams.get("token") ?? "";

  // Token-check als CADDY_ASK_TOKEN ingesteld is — anders alles weigeren
  // behalve lokale dev.
  if (env.CADDY_ASK_TOKEN) {
    if (!timingSafeEqualStr(token, env.CADDY_ASK_TOKEN)) {
      return new NextResponse("forbidden", { status: 403 });
    }
  } else if (env.NODE_ENV === "production") {
    return new NextResponse("CADDY_ASK_TOKEN not configured", { status: 503 });
  }

  if (!domain) {
    return new NextResponse("missing domain", { status: 400 });
  }

  const rootDomain = env.ROOT_DOMAIN.split(":")[0].toLowerCase();
  const tenantDomain = env.TENANT_DOMAIN.split(":")[0].toLowerCase();
  const cnameTarget = env.CUSTOM_DOMAIN_CNAME_TARGET.toLowerCase();

  // 1. Exacte platform-apex hosts: de bare domeinen + hun www-variant.
  //    GEEN endsWith — anders is elk subdomein weer toegestaan.
  const apexAllow = new Set<string>();
  for (const h of [rootDomain, tenantDomain, cnameTarget].filter(Boolean)) {
    apexAllow.add(h);
    apexAllow.add(`www.${h}`);
    if (h.startsWith("www.")) apexAllow.add(h.slice(4));
  }
  if (apexAllow.has(domain)) {
    return new NextResponse("ok", { status: 200 });
  }

  // 2. Tenant-subdomein <slug>.<tenantDomain>: precies ÉÉN label (geen
  //    multi-level junk) én de slug moet een bestaande organisatie zijn.
  if (tenantDomain && domain.endsWith("." + tenantDomain)) {
    const label = domain.slice(0, -(tenantDomain.length + 1));
    // Multi-level (a.b.<tenantDomain>) of leeg → direct weigeren, geen
    // DB-query: dit vangt het leeuwendeel van het bot-verkeer goedkoop af.
    if (!label || label.includes(".")) {
      return new NextResponse("invalid tenant host", { status: 404 });
    }
    const org = await db.organization.findUnique({
      where: { slug: label },
      select: { id: true },
    });
    if (org) {
      return new NextResponse("ok", { status: 200 });
    }
    return new NextResponse("unknown tenant", { status: 404 });
  }

  // 3. Custom-domein: alleen wanneer geverifieerd.
  const org = await db.organization.findUnique({
    where: { customDomain: domain },
    select: { customDomainVerifiedAt: true },
  });
  if (!org?.customDomainVerifiedAt) {
    return new NextResponse("not verified", { status: 404 });
  }
  return new NextResponse("ok", { status: 200 });
}
