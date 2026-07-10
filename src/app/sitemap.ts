import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { INTEGRATIONS } from "@/lib/integrations/catalog";

/**
 * Sitemap voor de publieke marketingsite (apex-domein). Alleen indexeerbare
 * marketing-pagina's — het dashboard, admin, portal, boek-flow, embed en de
 * tenant-sites (subdomeinen) horen hier NIET in en staan op noindex /
 * disallow (zie robots.ts).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.APP_URL.replace(/\/$/, "");
  // Vaste datum i.p.v. `new Date()`: de sitemap moet niet bij elke request
  // "zojuist gewijzigd" claimen. Bijwerken wanneer de marketing-content wijzigt.
  const lastModified = new Date("2026-07-11");

  const staticPages: {
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }[] = [
    { path: "", priority: 1, changeFrequency: "weekly" },
    { path: "/koppelingen", priority: 0.8, changeFrequency: "weekly" },
    { path: "/blog", priority: 0.7, changeFrequency: "weekly" },
    { path: "/over", priority: 0.5, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.5, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/voorwaarden", priority: 0.3, changeFrequency: "yearly" },
    { path: "/verwerkersovereenkomst", priority: 0.3, changeFrequency: "yearly" },
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPages.map((p) => ({
    url: `${base}${p.path}`,
    lastModified,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  // Elke koppeling-detailpagina: /koppelingen/{category}/{slug}
  const integrationEntries: MetadataRoute.Sitemap = INTEGRATIONS.map((i) => ({
    url: `${base}/koppelingen/${i.categorySlug}/${i.slug}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticEntries, ...integrationEntries];
}
