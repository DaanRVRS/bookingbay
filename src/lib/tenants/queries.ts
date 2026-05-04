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

export const getTenantItem = cache(async (organizationId: string, itemId: string) => {
  return db.item.findFirst({
    where: { id: itemId, organizationId, isActive: true },
    include: { category: { select: { id: true, name: true } } },
  });
});
