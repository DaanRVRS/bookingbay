import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1 MB; raise so item/logo image uploads (max 8 MB) fit.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
