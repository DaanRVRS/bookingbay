import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

export const getOrgBySlug = cache(async (slug: string) => {
  const org = await db.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      primaryColor: true,
      heroTitle: true,
      heroSubtitle: true,
      aboutText: true,
      contactEmail: true,
      contactPhone: true,
      itemDisplayStyle: true,
      industry: true,
      plan: true,
      businessHours: true,
      widgetAccent: true,
      widgetRadius: true,
      widgetShadow: true,
      widgetUsps: true,
      widgetTagline: true,
      widgetDefaultLocale: true,
      widgetTheme: true,
    },
  });
  return org;
});

export const getTenantCatalog = cache(async (organizationId: string) => {
  return db.category.findMany({
    where: { organizationId, parentId: null },
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        where: { isActive: true, isAddon: false },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          pricePerUnit: true,
          cleaningFee: true,
          captainFee: true,
          fuelFee: true,
          bookingIntervalMinutes: true,
          bookingWindowStartMin: true,
          bookingWindowEndMin: true,
        },
      },
      children: {
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            where: { isActive: true, isAddon: false },
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              description: true,
              imageUrl: true,
              pricePerUnit: true,
              cleaningFee: true,
              captainFee: true,
              fuelFee: true,
              bookingIntervalMinutes: true,
            },
          },
        },
      },
    },
  });
});

export type AddonOption = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  /** Category-ids waarbij deze add-on geldt; null = alle categorieën. */
  categoryIds: string[] | null;
};

/**
 * Actieve add-on-items (optionele extra's) van een org, met een geldige
 * stuksprijs. Gebruikt door de boek-widget en het dashboard-boekformulier
 * om na de itemkeuze extra's aan te kunnen bieden.
 */
export const getTenantAddons = cache(
  async (organizationId: string): Promise<AddonOption[]> => {
    const rows = await db.item.findMany({
      where: {
        organizationId,
        isActive: true,
        isAddon: true,
        addonPrice: { not: null },
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        addonPrice: true,
        addonCategoryIds: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      price: Number(r.addonPrice),
      categoryIds:
        Array.isArray(r.addonCategoryIds) && r.addonCategoryIds.length > 0
          ? (r.addonCategoryIds as string[])
          : null,
    }));
  },
);

export const searchTenantItems = cache(async (organizationId: string, query: string) => {
  const q = query.trim();
  if (!q) return [];
  return db.item.findMany({
    where: {
      organizationId,
      isActive: true,
      isAddon: false,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { category: { name: { contains: q, mode: "insensitive" } } },
      ],
    },
    include: { category: { select: { name: true, parentId: true } } },
    orderBy: { name: "asc" },
    take: 60,
  });
});

export const getTenantItem = cache(async (organizationId: string, itemId: string) => {
  return db.item.findFirst({
    where: { id: itemId, organizationId, isActive: true, isAddon: false },
    include: { category: { select: { id: true, name: true } } },
  });
});

export type PriceListItem = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  pricePerUnit: number | null;
  bookingIntervalMinutes: number;
  deposit: number | null;
  categoryName: string;
};

/**
 * Fetch items for a price-list block. When `categoryId` is null all active
 * items in the org are returned. When `itemIds` is non-empty (and source =
 * "items"), only those items are returned, in the order requested.
 */
export async function getPriceListItems(
  organizationId: string,
  opts: { categoryId?: string | null; itemIds?: string[] } = {},
): Promise<PriceListItem[]> {
  const { categoryId, itemIds } = opts;
  const useItemIds = itemIds && itemIds.length > 0;

  const rows = await db.item.findMany({
    where: {
      organizationId,
      isActive: true,
      isAddon: false,
      ...(useItemIds ? { id: { in: itemIds } } : {}),
      ...(categoryId && !useItemIds ? { categoryId } : {}),
    },
    include: { category: { select: { name: true } } },
    orderBy: { name: "asc" },
    take: 60,
  });

  const mapped = rows.map<PriceListItem>((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    imageUrl: r.imageUrl,
    pricePerUnit: r.pricePerUnit ? Number(r.pricePerUnit) : null,
    bookingIntervalMinutes: r.bookingIntervalMinutes,
    deposit: r.deposit ? Number(r.deposit) : null,
    categoryName: r.category.name,
  }));

  if (useItemIds) {
    const byId = new Map(mapped.map((m) => [m.id, m]));
    return itemIds!.map((id) => byId.get(id)).filter((x): x is PriceListItem => Boolean(x));
  }
  return mapped;
}
