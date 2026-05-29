import "server-only";
import { db } from "@/lib/db";

/**
 * Centrale fan-out helper voor in-app notifications (de bell). Eén
 * Notification-row per ontvanger — past bij het bestaande broadcast-model
 * (zie listNotificationsForUser).
 *
 * Geen email-fan-out hier — die loopt via @/lib/email apart. Notif en
 * email zijn losse kanalen: niet elke notif hoort als mail uit te gaan.
 */

interface NotifyInput {
  type: string;
  title: string;
  body: string;
  ctaUrl?: string | null;
  ctaLabel?: string | null;
}

/**
 * Fan-out naar alle leden van een organisatie (OWNER/ADMIN/MANAGER).
 * VIEWERs slaan we over — een read-only rol hoeft geen pings voor
 * operationele events (nieuwe boeking, betaling, afronding).
 *
 * `dedupeCtaSuffix` voorkomt dat dezelfde event-bron (bv. een booking
 * waarop een cron meerdere keren past) dubbele rows aanmaakt. Komt
 * overeen met "is er al een notif van dit type met deze ctaUrl-suffix?".
 * Skip dedup door deze leeg te laten.
 */
export async function notifyOrgMembers(
  organizationId: string,
  notif: NotifyInput,
  dedupeCtaSuffix?: string,
): Promise<{ recipients: number; skipped: boolean }> {
  if (dedupeCtaSuffix) {
    // organizationId MOET in de dedup-query: anders matcht een dedup-suffix
    // die niet org-uniek is (bv. de dag-digest `?digest=YYYY-MM-DD`, gelijk
    // voor alle orgs) na de eerste org elke volgende org → kreeg maar één
    // org per dag de digest.
    const existing = await db.notification.findFirst({
      where: {
        organizationId,
        type: notif.type,
        ctaUrl: { endsWith: dedupeCtaSuffix },
      },
      select: { id: true },
    });
    if (existing) return { recipients: 0, skipped: true };
  }

  const members = await db.membership.findMany({
    where: {
      organizationId,
      role: { in: ["OWNER", "ADMIN", "MANAGER"] },
    },
    select: { userId: true },
  });
  if (members.length === 0) return { recipients: 0, skipped: false };

  const now = new Date();
  const data = members.map((m) => ({
    userId: m.userId,
    organizationId,
    type: notif.type,
    title: notif.title,
    body: notif.body,
    ctaUrl: notif.ctaUrl ?? null,
    ctaLabel: notif.ctaLabel ?? null,
    createdAt: now,
  }));
  await db.notification.createMany({ data });
  return { recipients: members.length, skipped: false };
}
