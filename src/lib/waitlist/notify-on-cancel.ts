import "server-only";
import { db } from "@/lib/db";
import { sendEmail, emailLayout } from "@/lib/email";
import { audit } from "@/lib/audit/log";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

/**
 * Wordt aangeroepen wanneer een booking op CANCELED gaat (zowel vanuit
 * dashboard als portal). Zoekt wachtlijst-entries voor dezelfde item +
 * een gewenst venster dat overlapt met de vrijgekomen slot, en mailt
 * de eerstvolgende WAITING kandidaat.
 *
 * Per cancel sturen we max 1 mail — first-come, first-served. De tenant
 * kan in /dashboard/waitlist meerdere mensen tegelijk benaderen als de
 * eerste niet reageert.
 */
export async function notifyWaitlistOnCancel(canceledBookingId: string): Promise<{
  matched: number;
  notified: number;
}> {
  const booking = await db.booking.findUnique({
    where: { id: canceledBookingId },
    select: {
      id: true,
      organizationId: true,
      itemId: true,
      startAt: true,
      endAt: true,
      item: { select: { name: true } },
      organization: {
        select: { name: true, slug: true, contactEmail: true, contactPhone: true },
      },
    },
  });
  if (!booking) return { matched: 0, notified: 0 };

  // Match-criterium: wachtlijst-entry voor hetzelfde item waarvan het
  // desired-window overlapt met de vrijgekomen slot. Overlap = start van
  // de een vóór het eind van de ander en vice versa.
  const candidates = await db.waitlistEntry.findMany({
    where: {
      organizationId: booking.organizationId,
      itemId: booking.itemId,
      status: "WAITING",
      desiredStartAt: { lt: booking.endAt },
      desiredEndAt: { gt: booking.startAt },
    },
    orderBy: { createdAt: "asc" },
    take: 1,
  });

  if (candidates.length === 0) return { matched: 0, notified: 0 };

  const c = candidates[0];
  const start = format(booking.startAt, "EEEE d MMMM 'om' HH:mm", { locale: nl });
  const end = format(booking.endAt, "HH:mm");
  const contact =
    booking.organization.contactPhone || booking.organization.contactEmail
      ? `Reageer snel${
          booking.organization.contactPhone
            ? `: bel ${booking.organization.contactPhone}`
            : `: mail ${booking.organization.contactEmail}`
        } — de plek is voor wie het eerste boekt.`
      : "Boek snel — wie het eerst boekt, krijgt de plek.";

  const result = await sendEmail({
    to: c.customerEmail,
    subject: `Er is plek vrij voor ${booking.item.name}`,
    html: emailLayout(`
      <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600">Hoi ${c.customerName},</h1>
      <p style="margin:0 0 12px 0">
        Goed nieuws — er is een plek vrijgekomen voor <strong>${booking.item.name}</strong>
        bij <strong>${booking.organization.name}</strong>.
      </p>
      <p style="margin:0 0 8px 0"><strong>Wanneer:</strong> ${start} — tot ${end}</p>
      <p style="margin:16px 0 0 0">${contact}</p>
    `),
    text: `Er is plek vrij voor ${booking.item.name} bij ${booking.organization.name} op ${start} - ${end}. ${contact}`,
  });

  if (!result.ok) {
    return { matched: candidates.length, notified: 0 };
  }

  // Notified-stempel + verloopt over 24u zodat de tenant weet hoe lang
  // hij/zij op antwoord moet wachten.
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.waitlistEntry.update({
    where: { id: c.id },
    data: { status: "NOTIFIED", notifiedAt: new Date(), expiresAt },
  });
  await audit({
    organizationId: booking.organizationId,
    action: "waitlist.notified",
    resource: "waitlistEntry",
    resourceId: c.id,
    metadata: {
      bookingFreedId: booking.id,
      to: c.customerEmail,
    },
  });
  return { matched: candidates.length, notified: 1 };
}
