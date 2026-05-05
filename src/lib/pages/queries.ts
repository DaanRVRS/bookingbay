import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { safeParseBlocks, type Block } from "./blocks";

export type PageRecord = {
  id: string;
  organizationId: string;
  slug: string;
  title: string;
  blocks: Block[];
  isPublished: boolean;
  showInNav: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

function rowToRecord(row: {
  id: string;
  organizationId: string;
  slug: string;
  title: string;
  blocks: unknown;
  isPublished: boolean;
  showInNav: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): PageRecord {
  return { ...row, blocks: safeParseBlocks(row.blocks) };
}

export async function listPagesForOrg(organizationId: string): Promise<PageRecord[]> {
  const rows = await db.page.findMany({
    where: { organizationId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(rowToRecord);
}

export async function getPageById(
  organizationId: string,
  id: string,
): Promise<PageRecord | null> {
  const row = await db.page.findFirst({ where: { id, organizationId } });
  return row ? rowToRecord(row) : null;
}

/** Public lookup by tenant slug + page slug. Only returns published pages. */
export const getPublishedPage = cache(
  async (organizationId: string, slug: string): Promise<PageRecord | null> => {
    const row = await db.page.findFirst({
      where: { organizationId, slug, isPublished: true },
    });
    return row ? rowToRecord(row) : null;
  },
);

/** Pages to surface in the public-site nav (published + showInNav). */
export const getNavPages = cache(async (organizationId: string) => {
  const rows = await db.page.findMany({
    where: { organizationId, isPublished: true, showInNav: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { slug: true, title: true },
  });
  return rows;
});
