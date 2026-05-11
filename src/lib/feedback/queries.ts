import "server-only";
import { db } from "@/lib/db";

export async function listFeedbackForAdmin(opts?: {
  source?: string;
  ratingMin?: number;
  ratingMax?: number;
}) {
  return db.userFeedback.findMany({
    where: {
      ...(opts?.source ? { source: opts.source } : {}),
      ...(opts?.ratingMin !== undefined || opts?.ratingMax !== undefined
        ? {
            rating: {
              ...(opts?.ratingMin !== undefined ? { gte: opts.ratingMin } : {}),
              ...(opts?.ratingMax !== undefined ? { lte: opts.ratingMax } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          memberships: {
            select: {
              organization: { select: { id: true, name: true, slug: true } },
            },
            take: 3,
          },
        },
      },
    },
    take: 300,
  });
}

export async function getFeedbackStats() {
  const [total, byRating, recentSignupFeedback] = await Promise.all([
    db.userFeedback.count(),
    db.userFeedback.groupBy({
      by: ["rating"],
      _count: { _all: true },
    }),
    db.userFeedback.count({ where: { source: "signup-prompt" } }),
  ]);
  const ratingMap: Record<number, number> = {};
  for (const r of byRating) ratingMap[r.rating] = r._count._all;
  const ratedCount = byRating
    .filter((r) => r.rating > 0)
    .reduce((acc, r) => acc + r._count._all, 0);
  const ratedSum = byRating
    .filter((r) => r.rating > 0)
    .reduce((acc, r) => acc + r.rating * r._count._all, 0);
  const avgRating = ratedCount > 0 ? ratedSum / ratedCount : 0;
  return {
    total,
    ratingMap,
    avgRating,
    signupPromptCount: recentSignupFeedback,
  };
}
