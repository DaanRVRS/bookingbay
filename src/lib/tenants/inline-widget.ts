import "server-only";
import { db } from "@/lib/db";
import { getTenantCatalog, getTenantAddons } from "./queries";
import { resolveWidgetDesign } from "@/lib/widget/design";
import type { WidgetTheme, WidgetUsp } from "@/lib/widget/theme";

/**
 * Data voor een op-de-pagina ingesloten boek-widget (het "Boek-widget"-blok
 * in de site-builder). Levert exact wat <SmartBookingWidget /> nodig heeft —
 * dezelfde vorm als /site/[slug]/embed/book, maar geladen via organizationId
 * zodat de PageRenderer 'm kan ophalen zonder de slug te kennen.
 */
export interface InlineWidgetBucket {
  id: string;
  name: string;
  categoryIds: string[];
  items: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    pricePerUnit: number | null;
    bookingIntervalMinutes: number;
    cleaningFee: number | null;
    captainFee: number | null;
    fuelFee: number | null;
  }[];
}

export interface InlineWidgetData {
  slug: string;
  orgName: string;
  logoUrl: string | null;
  accent: string;
  categories: InlineWidgetBucket[];
  addons: Awaited<ReturnType<typeof getTenantAddons>>;
  usps: WidgetUsp[];
  tagline: string | null;
  defaultLocale: string;
  theme: WidgetTheme;
}

function buildBuckets(
  categories: Awaited<ReturnType<typeof getTenantCatalog>>,
): InlineWidgetBucket[] {
  const out: InlineWidgetBucket[] = [];
  const mapItem = (i: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    pricePerUnit: unknown;
    bookingIntervalMinutes: number;
    cleaningFee: unknown;
    captainFee: unknown;
    fuelFee: unknown;
  }) => ({
    id: i.id,
    name: i.name,
    description: i.description,
    imageUrl: i.imageUrl,
    pricePerUnit: i.pricePerUnit ? Number(i.pricePerUnit) : null,
    bookingIntervalMinutes: i.bookingIntervalMinutes,
    cleaningFee: i.cleaningFee ? Number(i.cleaningFee) : null,
    captainFee: i.captainFee ? Number(i.captainFee) : null,
    fuelFee: i.fuelFee ? Number(i.fuelFee) : null,
  });
  for (const cat of categories) {
    if (cat.items.length > 0) {
      out.push({
        id: cat.id,
        name: cat.name,
        categoryIds: [cat.id],
        items: cat.items.map(mapItem),
      });
    }
    for (const sub of cat.children) {
      if (sub.items.length > 0) {
        out.push({
          id: sub.id,
          name: `${cat.name} · ${sub.name}`,
          categoryIds: [cat.id, sub.id],
          items: sub.items.map(mapItem),
        });
      }
    }
  }
  return out;
}

export async function getInlineWidgetData(
  organizationId: string,
): Promise<InlineWidgetData | null> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      name: true,
      slug: true,
      logoUrl: true,
      primaryColor: true,
      widgetAccent: true,
      widgetRadius: true,
      widgetShadow: true,
      widgetUsps: true,
      widgetTagline: true,
      widgetDefaultLocale: true,
      widgetTheme: true,
    },
  });
  if (!org) return null;

  const [categories, addons] = await Promise.all([
    getTenantCatalog(organizationId),
    getTenantAddons(organizationId),
  ]);
  const buckets = buildBuckets(categories);
  // Geen boekbare items → niets om te tonen (het blok rendert dan niets).
  if (buckets.length === 0) return null;

  const design = resolveWidgetDesign(org, {});
  return {
    slug: org.slug,
    orgName: org.name,
    logoUrl: org.logoUrl,
    accent: design.accent,
    categories: buckets,
    addons,
    usps: design.usps,
    tagline: design.tagline,
    defaultLocale: design.defaultLocale,
    theme: design.theme,
  };
}
