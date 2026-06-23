import "server-only";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { db } from "@/lib/db";
import { sendEmail, emailLayout, escapeHtml } from "@/lib/email";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit/log";
import {
  flatFeeLines,
  sumFlatFees,
  type BookingAddonLine,
} from "@/lib/bookings/price";

/**
 * Stuurt de klant een bevestiging met daarin de pre-authenticated
 * portal-link (`/portal/[slug]/booking/[id]?token=…`). Geen login nodig —
 * de link werkt direct.
 *
 * Alleen versturen als:
 *  - customerPortalEnabled aan staat
 *  - de boeking een email + een portalToken heeft
 *
 * Best-effort: faalt de mail, dan blijft de boeking gewoon staan en
 * heeft de tenant zelf nog z'n eigen kanaal (dashboard) om de klant te
 * benaderen.
 */
export async function sendBookingConfirmationMail(
  bookingId: string,
): Promise<{ sent: boolean; reason?: string }> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      organizationId: true,
      startAt: true,
      endAt: true,
      totalPrice: true,
      addons: true,
      portalToken: true,
      customer: { select: { name: true, email: true } },
      item: {
        select: {
          name: true,
          cleaningFee: true,
          captainFee: true,
          fuelFee: true,
        },
      },
      organization: {
        select: {
          name: true,
          slug: true,
          contactEmail: true,
          contactPhone: true,
          customerPortalEnabled: true,
        },
      },
    },
  });
  if (!booking) return { sent: false, reason: "booking-not-found" };
  if (!booking.organization.customerPortalEnabled) {
    return { sent: false, reason: "portal-disabled" };
  }
  if (!booking.customer.email) return { sent: false, reason: "no-customer-email" };
  if (!booking.portalToken) return { sent: false, reason: "no-token" };

  const baseUrl = env.APP_URL.replace(/\/$/, "");
  const portalUrl =
    `${baseUrl}/portal/${booking.organization.slug}` +
    `/booking/${booking.id}?token=${encodeURIComponent(booking.portalToken)}`;

  const start = format(booking.startAt, "EEEE d MMMM 'om' HH:mm", { locale: nl });
  const end = format(booking.endAt, "HH:mm", { locale: nl });
  const totalEur = Number(booking.totalPrice);
  const amount = `€${totalEur.toFixed(2).replace(".", ",")}`;

  // Klant- en tenant-invoer escapen vóór HTML-interpolatie (zie escapeHtml).
  const safeCustomer = escapeHtml(booking.customer.name);
  const safeOrg = escapeHtml(booking.organization.name);
  const safeItem = escapeHtml(booking.item.name);

  // Splitsing tonen als het item vaste fees heeft — anders wekt het
  // verwarring ("waarom is het meer dan de item-prijs?").
  const feeLines = flatFeeLines(booking.item);
  const feesTotal = sumFlatFees(booking.item);
  const subtotalEur = Math.max(0, totalEur - feesTotal);
  const feesSplitLine =
    feesTotal > 0
      ? `<p style="margin:0 0 4px 0;color:#6b7280;font-size:13px">Subtotaal: €${subtotalEur
          .toFixed(2)
          .replace(".", ",")}${feeLines
          .map(
            (l) =>
              ` + ${escapeHtml(l.label.toLowerCase())} €${l.amount.toFixed(2).replace(".", ",")}`,
          )
          .join("")}</p>`
      : "";

  // Gekozen extra's tonen als losse regel zodat het totaal verklaarbaar is.
  const addonList = (booking.addons as BookingAddonLine[] | null) ?? [];
  const addonsLine =
    addonList.length > 0
      ? `<p style="margin:0 0 4px 0"><strong>Extra's:</strong> ${addonList
          .map((a) => `${escapeHtml(a.name)}${a.quantity > 1 ? ` ×${a.quantity}` : ""}`)
          .join(", ")}</p>`
      : "";

  const contactLine =
    booking.organization.contactPhone || booking.organization.contactEmail
      ? `Heb je een vraag? ${
          booking.organization.contactPhone
            ? `Bel ${escapeHtml(booking.organization.contactPhone)}`
            : `Mail ${escapeHtml(booking.organization.contactEmail ?? "")}`
        }.`
      : "";

  const result = await sendEmail({
    to: booking.customer.email,
    subject: `Bevestiging: ${booking.item.name} bij ${booking.organization.name}`,
    html: emailLayout(`
      <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600">Bedankt, ${safeCustomer}!</h1>
      <p style="margin:0 0 12px 0">
        Je boeking bij <strong>${safeOrg}</strong> staat in de planning.
      </p>
      <p style="margin:0 0 4px 0"><strong>Wat:</strong> ${safeItem}</p>
      <p style="margin:0 0 4px 0"><strong>Wanneer:</strong> ${start} — tot ${end}</p>
      ${addonsLine}
      <p style="margin:0 0 4px 0"><strong>Totaal:</strong> ${amount}</p>
      ${feesSplitLine}
      <div style="height:12px"></div>
      <p style="margin:0 0 24px 0">
        Bekijk of annuleer je boeking via de knop hieronder. Geen account
        of wachtwoord nodig — je link werkt direct.
      </p>
      <p style="margin:24px 0">
        <a href="${portalUrl}" style="display:inline-block;background:#ef5934;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px">
          Bekijk mijn boeking
        </a>
      </p>
      ${contactLine ? `<p style="margin:24px 0 0 0;color:#6b7280;font-size:13px">${contactLine}</p>` : ""}
    `),
    text: `Bedankt ${booking.customer.name}! Je boeking voor ${booking.item.name} bij ${booking.organization.name} staat op ${start} - ${end}. Bekijk 'm hier: ${portalUrl}`,
  });

  if (result.ok) {
    await audit({
      organizationId: booking.organizationId,
      action: "booking.confirmation-mail.sent",
      resource: "booking",
      resourceId: booking.id,
      metadata: { to: booking.customer.email },
    });
  }

  return { sent: result.ok, reason: result.ok ? undefined : result.error };
}
