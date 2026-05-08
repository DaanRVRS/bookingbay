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
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          pricePerHour: true,
          pricePerDay: true,
          pricePerWeek: true,
        },
      },
      children: {
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            where: { isActive: true },
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              description: true,
              imageUrl: true,
              pricePerHour: true,
              pricePerDay: true,
              pricePerWeek: true,
            },
          },
        },
      },
    },
  });
});

export const searchTenantItems = cache(async (organizationId: string, query: string) => {
  const q = query.trim();
  if (!q) return [];
  return db.item.findMany({
    where: {
      organizationId,
      isActive: true,
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
    where: { id: itemId, organizationId, isActive: true },
    include: { category: { select: { id: true, name: true } } },
  });
});

export type PriceListItem = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  pricePerHour: number | null;
  pricePerDay: number | null;
  pricePerWeek: number | null;
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
    pricePerHour: r.pricePerHour ? Number(r.pricePerHour) : null,
    pricePerDay: r.pricePerDay ? Number(r.pricePerDay) : null,
    pricePerWeek: r.pricePerWeek ? Number(r.pricePerWeek) : null,
    deposit: r.deposit ? Number(r.deposit) : null,
    categoryName: r.category.name,
  }));

  if (useItemIds) {
    const byId = new Map(mapped.map((m) => [m.id, m]));
    return itemIds!.map((id) => byId.get(id)).filter((x): x is PriceListItem => Boolean(x));
  }
  return mapped;
}
