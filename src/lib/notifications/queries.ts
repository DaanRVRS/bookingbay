import "server-only";
import { db } from "@/lib/db";

export type NotificationRecord = {
  id: string;
  type: string;
  title: string;
  body: string;
  ctaUrl: string | null;
  ctaLabel: string | null;
  readAt: Date | null;
  createdAt: Date;
  createdBy: { name: string | null; email: string } | null;
};

export async function listNotificationsForUser(
  userId: string,
  limit = 50,
): Promise<NotificationRecord[]> {
  const rows = await db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      ctaUrl: true,
      ctaLabel: true,
      readAt: true,
      createdAt: true,
      createdBy: { select: { name: true, email: true } },
    },
  });
  return rows;
}

export async function getUnreadCount(userId: string): Promise<number> {
  return db.notification.count({
    where: { userId, readAt: null },
  });
}
