import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1 MB; raise so item/logo image uploads (max 8 MB) fit.
      bodySizeLimit: "10mb",
      // Achter nginx + multi-domein (www, tenant-subdomeinen, .eu, nip.io)
      // weigert Next.js' ingebouwde Server-Action CSRF-check elke POST
      // waarvan de Origin niet matcht met de (proxied) host. Zonder deze
      // lijst faalt elke boeking via de widget met "Failed to find Server
      // Action". Wildcards dekken alle tenant-subdomeinen.
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
};

export default nextConfig;
