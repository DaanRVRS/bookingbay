import type { NextConfig } from "next";

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
        // Booking-widget pagina's + publieke API mogen niet door browser of
        // proxy gecachet worden — altijd verse code/data zodat een deploy
        // nooit een stale bundle met dode action-refs achterlaat.
        source: "/book/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
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
