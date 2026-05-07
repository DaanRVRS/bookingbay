import "server-only";
import { cache } from "react";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { safeParseBlocks, type Block } from "./blocks";

function newBlockId(): string {
  return `b_${randomBytes(8).toString("hex")}${Date.now().toString(36)}`;
}

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

/**
 * Build initial blocks for a fresh home page from the legacy customizer
 * fields (heroTitle / heroSubtitle / aboutText). Returns an empty array
 * if the org has none of those set.
 */
async function seedBlocksFromLegacy(organizationId: string): Promise<Block[]> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      name: true,
      heroTitle: true,
      heroSubtitle: true,
      aboutText: true,
    },
  });
  if (!org) return [];

  const blocks: Block[] = [];

  blocks.push({
    id: newBlockId(),
    type: "hero",
    heading: org.heroTitle ?? org.name,
    subheading:
      org.heroSubtitle ?? `Online reserveren bij ${org.name}.`,
    buttonText: "Bekijk het aanbod",
    buttonHref: "#aanbod",
    backgroundImageUrl: "",
    alignment: "left",
  });

  if (org.aboutText && org.aboutText.trim().length > 0) {
    blocks.push({
      id: newBlockId(),
      type: "text",
      heading: "",
      body: org.aboutText,
      alignment: "left",
    });
  }

  return blocks;
}

/**
 * Ensures the org has a home page record. Idempotent — call from any
 * dashboard entry that surfaces the page builder.
 *
 * The home page lives at slug "home" and is the only page guaranteed to
 * exist. UI prevents renaming or deleting it.
 *
 * On first creation (or when the existing row is empty AND has never been
 * edited) we seed it from the legacy customizer fields so the user sees
 * their existing tenant content as editable blocks instead of an empty
 * canvas.
 */
export async function ensureHomePage(organizationId: string): Promise<PageRecord> {
  const existing = await db.page.findFirst({
    where: { organizationId, slug: "home" },
  });

  if (existing) {
    // Re-seed if the row is empty AND looks unedited (createdAt ≈ updatedAt).
    // This catches orgs that got an empty home page from an earlier deploy
    // but never actually opened the builder.
    const currentBlocks = safeParseBlocks(existing.blocks);
    const untouched =
      Math.abs(existing.updatedAt.getTime() - existing.createdAt.getTime()) < 2000;
    if (currentBlocks.length === 0 && untouched) {
      const seeded = await seedBlocksFromLegacy(organizationId);
      if (seeded.length > 0) {
        const updated = await db.page.update({
          where: { id: existing.id },
          data: { blocks: seeded },
        });
        return rowToRecord(updated);
      }
    }
    return rowToRecord(existing);
  }

  const seeded = await seedBlocksFromLegacy(organizationId);

  const created = await db.page.create({
    data: {
      organizationId,
      title: "Homepagina",
      slug: "home",
      blocks: seeded,
      // Keep home pinned at the top of the pages list.
      sortOrder: -1,
      // Hide from nav by default — it's the root, not a separate menu item.
      showInNav: false,
    },
  });
  return rowToRecord(created);
}

export function isHomeSlug(slug: string): boolean {
  return slug === "home";
}
