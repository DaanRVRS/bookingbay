import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

/**
 * robots.txt voor het apex-domein. Marketing is crawlbaar; alle app-, privé-
 * en tenant-paden zijn uitgesloten (die staan ook per pagina op noindex).
 */
export default function robots(): MetadataRoute.Robots {
  const base = env.APP_URL.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/admin",
          "/api",
          "/portal",
          "/book",
          "/exports",
          "/demo",
          "/onboarding",
          "/invite",
          "/site", // tenant-sites draaien op subdomeinen, niet via het apex-pad
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/verify-email",
          "/check-email",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
