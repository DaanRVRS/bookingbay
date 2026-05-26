import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPortalSession } from "@/lib/portal/session";
import { audit } from "@/lib/audit/log";
import { notifyOrgMembers } from "@/lib/notifications/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Klant annuleert z'n eigen boeking via het portaal. Mag alleen als:
 *  - portal session aanwezig + booking-email == session.email
 *  - booking.status in (CONFIRMED, PENDING)
 *  - startAt - now >= organization.customerPortalCancelHoursMin
 */
export async function POST(req: Request) {
  let body: { slug?: string; bookingId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ongeldige aanvraag" }, { status: 400 });
  }
  const slug = (body.slug ?? "").trim().toLowerCase();
  const bookingId = (body.bookingId ?? "").trim();
  if (!slug || !bookingId) {
    return NextResponse.json({ ok: false, error: "Slug + bookingId vereist" }, { status: 400 });
  }

  const org = await db.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      customerPortalEnabled: true,
      customerPortalCancelHoursMin: true,
    },
  });
  if (!org || !org.customerPortalEnabled) {
    return NextResponse.json({ ok: false, error: "Portaal is niet beschikbaar" }, { status: 404 });
  }

  const session = await getPortalSession(org.id);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Niet ingelogd" }, { status: 401 });
  }

  const booking = await db.booking.findFirst({
    where: {
      id: bookingId,
      organizationId: org.id,
      customer: { email: session.email },
    },
    select: {
      id: true,
      startAt: true,
      status: true,
      customer: { select: { name: true } },
      item: { select: { name: true } },
    },
  });
  if (!booking) {
    return NextResponse.json({ ok: false, error: "Boeking niet gevonden" }, { status: 404 });
  }
  if (booking.status !== "CONFIRMED" && booking.status !== "PENDING") {
    return NextResponse.json(
      { ok: false, error: "Boeking kan niet meer geannuleerd worden" },
      { status: 400 },
    );
  }

  const hoursUntil = (booking.startAt.getTime() - Date.now()) / (60 * 60 * 1000);
  if (hoursUntil < org.customerPortalCancelHoursMin) {
    return NextResponse.json(
      {
        ok: false,
        error: `Boeking kan tot ${org.customerPortalCancelHoursMin} uur vóór de starttijd worden geannuleerd.`,
      },
      { status: 400 },
    );
  }

  await db.booking.update({
    where: { id: booking.id },
    data: { status: "CANCELED" },
  });
  await audit({
    organizationId: org.id,
    action: "booking.cancel",
    resource: "booking",
    resourceId: booking.id,
    metadata: { source: "customer-portal", email: session.email },
  });

  // Org-members op de hoogte brengen — een klant-annulering raakt de
  // planning, daar moet de eigenaar van weten.
  try {
    await notifyOrgMembers(org.id, {
      type: "booking.canceled-by-customer",
      title: "Boeking geannuleerd door klant",
      body: `${booking.customer.name} heeft zijn/haar boeking van ${booking.item.name} geannuleerd via het portaal.`,
      ctaUrl: `/dashboard/bookings/${booking.id}`,
      ctaLabel: "Bekijk",
    });
  } catch (err) {
    console.error("[portal/cancel-booking] notif mislukt:", err);
  }

  return NextResponse.json({ ok: true });
}
