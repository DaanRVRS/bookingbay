import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

export type ReviewRecord = {
  id: string;
  quote: string;
  author: string;
  role: string | null;
  rating: number;
  isPublished: boolean;
  sortOrder: number;
  /** Datum van ontvangen toestemming (null bij reviews van vóór de vastlegging). */
  consentReceivedAt: Date | null;
};

const REVIEW_SELECT = {
  id: true,
  quote: true,
  author: true,
  role: true,
  rating: true,
  isPublished: true,
  sortOrder: true,
  consentReceivedAt: true,
} as const;

export async function listReviewsForOrg(
  organizationId: string,
): Promise<ReviewRecord[]> {
  const rows = await db.review.findMany({
    where: { organizationId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: REVIEW_SELECT,
  });
  return rows;
}

export const getPublishedReviews = cache(
  async (organizationId: string): Promise<ReviewRecord[]> => {
    const rows = await db.review.findMany({
      where: { organizationId, isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: REVIEW_SELECT,
    });
    return rows;
  },
);

export async function getReviewsByIds(
  organizationId: string,
  ids: string[],
): Promise<ReviewRecord[]> {
  if (ids.length === 0) return [];
  const rows = await db.review.findMany({
    where: { organizationId, id: { in: ids }, isPublished: true },
    select: REVIEW_SELECT,
  });
  // Preserve the order requested by the caller.
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((r): r is ReviewRecord => Boolean(r));
}
