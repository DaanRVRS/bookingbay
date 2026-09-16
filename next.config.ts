import type { NextConfig } from "next";

// Eigen domeinen (marketingsite, dashboard, tenant-subdomeinen). Hierop
// mag HSTS mét includeSubDomains; op custom-domeinen van klanten sturen we
// HSTS zónder includeSubDomains, zodat we niet ongevraagd de overige
// subdomeinen van een klant naar HTTPS dwingen.
const OWN_HOST_PATTERN = "(.*\\.)?bookingbay\\.(nl|eu)";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1 MB; raise so item/logo image uploads (max 8 MB) fit.
      bodySizeLimit: "10mb",
      // Achter nginx/Caddy + multi-domein (www, tenant-subdomeinen, .eu,
      // nip.io) weigert Next.js' ingebouwde Server-Action CSRF-check elke
      // POST waarvan de Origin niet matcht met de (proxied) host. Wildcards
      // dekken alle tenant-subdomeinen.
      allowedOrigins: [
        "www.bookingbay.nl",
        "bookingbay.nl",
        "*.bookingbay.nl",
        "www.bookingbay.eu",
        "bookingbay.eu",
        "*.bookingbay.eu",
        "bookingbay.178-104-86-251.nip.io",
        "*.bookingbay.178-104-86-251.nip.io",
      ],
    },
  },
  async headers() {
    return [
      // ── Beveiligingsheaders op alles ─────────────────────────────────
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: OWN_HOST_PATTERN }],
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
      {
        source: "/:path*",
        missing: [{ type: "host", value: OWN_HOST_PATTERN }],
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
        ],
      },
      // Clickjacking: alles DENY, behalve wat legitiem in een iframe moet:
      //  - /book/*                → boekpagina (widget-link / dashboard-preview)
      //  - /embed/*               → embed op de tenant-host (rewrite → /site/…/embed)
      //  - /site/<slug>/embed/*   → embed via het pad-alias
      //  - /site/<slug>[/…]       → klantsite-preview in het dashboard (SAMEORIGIN)
      // Config-headers matchen op het oorspronkelijke pad (vóór de host-
      // rewrite in proxy.ts), vandaar zowel /embed/* als /site/*/embed/*.
      {
        source: "/((?!book(?:/|$)|embed(?:/|$)|site(?:/|$)).*)",
        headers: [{ key: "X-Frame-Options", value: "DENY" }],
      },
      {
        source: "/site/((?!.*embed(?:/|$)).*)",
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
      {
        // De embed-loader mag NOOIT lang gecachet worden: anders blijven
        // externe sites maandenlang oude widget-code draaien na een deploy.
        // must-revalidate forceert dat de browser elke keer checkt of er
        // een nieuwe versie is.
        source: "/embed.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        // Betalingspagina mag NOOIT gecached worden: paymentStatus wisselt
        // realtime (Mollie/Stripe webhooks). Cachen zou een al-betaalde
        // bezoeker een "wacht op betaling"-scherm laten zien.
        source: "/book/:slug/betaling/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
      // /book/:slug zelf krijgt GEEN no-store meer — die route gebruikt
      // `export const revalidate = 60` (ISR). Met de oude no-store-header
      // moest élke widget-iframe-load opnieuw door getOrgBySlug +
      // getTenantCatalog + theme-parsing. Nu laat Next zijn eigen
      // s-maxage-header zetten zodat Caddy/proxy 'm 60s mag bewaren.
      // De widget-loader (/embed.js) blijft must-revalidate, dus
      // klant-sites pikken nieuwe widget-versies meteen op.
      {
        source: "/site/:slug/embed/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
      {
        source: "/api/public/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
