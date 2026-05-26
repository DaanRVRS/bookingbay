import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit/log";
import { notifyOrgMembers } from "@/lib/notifications/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Klant annuleert z'n eigen boeking via de portal-link. Geen session —
 * auth gebeurt via de portalToken in de mail (= bezit van die token =
 * bewijs van eigendom van de booking-link). Mag alleen als:
 *  - portalToken matcht via constant-time compare
 *  - booking.status in (CONFIRMED, PENDING)
 *  - startAt - now >= organization.customerPortalCancelHoursMin
 */
export async function POST(req: Request) {
  let body: { slug?: string; bookingId?: string; token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ongeldige aanvraag" }, { status: 400 });
  }
  const slug = (body.slug ?? "").trim().toLowerCase();
  const bookingId = (body.bookingId ?? "").trim();
  const token = (body.token ?? "").trim();
  if (!slug || !bookingId || !token) {
    return NextResponse.json(
      { ok: false, error: "Slug + bookingId + token vereist" },
      { status: 400 },
    );
  }

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      startAt: true,
      status: true,
      portalToken: true,
      organizationId: true,
      customer: { select: { name: true } },
      item: { select: { name: true } },
      organization: {
        select: {
          id: true,
          slug: true,
          customerPortalEnabled: true,
          customerPortalCancelHoursMin: true,
        },
      },
    },
  });

  // Constant-time token-check — geen kans op timing-leaks. We weigeren
  // expliciet met 404 als organization niet matcht of token niet matcht,
  // zodat een attacker niet kan deduceren of een booking-id bestaat.
  if (
    !booking ||
    !booking.portalToken ||
    booking.organization.slug !== slug ||
    !safeEqual(booking.portalToken, token)
  ) {
    return NextResponse.json({ ok: false, error: "Niet gevonden" }, { status: 404 });
  }
  if (!booking.organization.customerPortalEnabled) {
    return NextResponse.json({ ok: false, error: "Portaal staat uit" }, { status: 404 });
  }

  if (booking.status !== "CONFIRMED" && booking.status !== "PENDING") {
    return NextResponse.json(
      { ok: false, error: "Boeking kan niet meer geannuleerd worden" },
      { status: 400 },
    );
  }

  const hoursUntil = (booking.startAt.getTime() - Date.now()) / (60 * 60 * 1000);
  if (hoursUntil < booking.organization.customerPortalCancelHoursMin) {
    return NextResponse.json(
      {
        ok: false,
        error: `Boeking kan tot ${booking.organization.customerPortalCancelHoursMin} uur vóór de starttijd worden geannuleerd.`,
      },
      { status: 400 },
    );
  }

  await db.booking.update({
    where: { id: booking.id },
    data: { status: "CANCELED" },
  });
  await audit({
    organizationId: booking.organizationId,
    action: "booking.cancel",
    resource: "booking",
    resourceId: booking.id,
    metadata: { source: "customer-portal-token" },
  });

  try {
    await notifyOrgMembers(booking.organizationId, {
      type: "booking.canceled-by-customer",
      title: "Boeking geannuleerd door klant",
      body: `${booking.customer.name} heeft zijn/haar boeking van ${booking.item.name} geannuleerd via de portal-link.`,
      ctaUrl: `/dashboard/bookings/${booking.id}`,
      ctaLabel: "Bekijk",
    });
  } catch (err) {
    console.error("[portal/cancel-booking] notif mislukt:", err);
  }

  return NextResponse.json({ ok: true });
}

function safeEqual(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
