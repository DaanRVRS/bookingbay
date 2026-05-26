import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { notifyOrgMembers } from "@/lib/notifications/send";
import { sendEmail, emailLayout } from "@/lib/email";
import { audit } from "@/lib/audit/log";
import { format, startOfDay, endOfDay } from "date-fns";
import { nl } from "date-fns/locale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily booking-pulse. Eén cron-call doet drie dingen:
 *
 *   1. Ochtend-digest:   notif per org met de boekingen die VANDAAG starten
 *   2. Afronding-reminder: notif voor boekingen waarvan endAt 2-24u geleden
 *                          was en die nog niet op COMPLETED gezet zijn
 *   3. Klant-email-reminder: e-mail naar customer.email 12-36u vóór startAt,
 *                          gededupeerd via Booking.customerReminderSentAt
 *
 * Aanroepen één keer per dag, bv. 07:00 lokale tijd:
 *
 *   0 7 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
 *             https://bookingbay.nl/api/cron/booking-pulse > /dev/null
 */
export async function GET(req: Request) {
  if (!env.CRON_SECRET) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [digest, completion, customerMails, reviewRequests] = await Promise.all([
      runOchtendDigest(),
      runAfrondingReminder(),
      runKlantEmailReminder(),
      runReviewRequests(),
    ]);
    return NextResponse.json({
      ok: true,
      digest,
      completion,
      customerMails,
      reviewRequests,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/booking-pulse] failed:", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// ── 1. Ochtend-digest ────────────────────────────────────────────────────

async function runOchtendDigest() {
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  // Groepeer per org. Eén query, in-memory bucketen → minder DB-round-trips
  // dan per-org één query trekken.
  const todays = await db.booking.findMany({
    where: {
      startAt: { gte: dayStart, lte: dayEnd },
      status: { in: ["CONFIRMED", "IN_PROGRESS", "PENDING"] },
    },
    select: {
      id: true,
      organizationId: true,
      startAt: true,
      customer: { select: { name: true } },
      item: { select: { name: true } },
    },
    orderBy: { startAt: "asc" },
  });

  const byOrg = new Map<string, typeof todays>();
  for (const b of todays) {
    const arr = byOrg.get(b.organizationId) ?? [];
    arr.push(b);
    byOrg.set(b.organizationId, arr);
  }

  let orgsNotified = 0;
  for (const [orgId, bookings] of byOrg) {
    // Dedup: één digest per org per dag.
    const dedupeSuffix = `digest=${format(dayStart, "yyyy-MM-dd")}`;
    const body = bookings
      .slice(0, 5)
      .map(
        (b) =>
          `• ${format(b.startAt, "HH:mm")} — ${b.customer.name} (${b.item.name})`,
      )
      .join("\n");
    const extra = bookings.length > 5 ? `\n…en ${bookings.length - 5} meer.` : "";

    const result = await notifyOrgMembers(
      orgId,
      {
        type: "booking.day-digest",
        title: `Vandaag: ${bookings.length} boeking${bookings.length === 1 ? "" : "en"}`,
        body: `${body}${extra}`,
        ctaUrl: `/dashboard/bookings?${dedupeSuffix}`,
        ctaLabel: "Bekijk planning",
      },
      `?${dedupeSuffix}`,
    );
    if (result.recipients > 0) orgsNotified++;
  }

  return { orgsWithBookings: byOrg.size, orgsNotified };
}

// ── 2. Afronding-reminder ────────────────────────────────────────────────

async function runAfrondingReminder() {
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Boekingen die 2-24u geleden af hadden moeten zijn, maar nog niet
  // gemarkeerd zijn als COMPLETED. Window van 24u zodat we ook bookings
  // pakken die we gisteren misten (cron faalt → recovery).
  const stale = await db.booking.findMany({
    where: {
      endAt: { lt: twoHoursAgo, gte: oneDayAgo },
      completedAt: null,
      status: { in: ["CONFIRMED", "IN_PROGRESS"] },
    },
    select: {
      id: true,
      organizationId: true,
      customer: { select: { name: true } },
      item: { select: { name: true } },
    },
  });

  let notified = 0;
  for (const b of stale) {
    const result = await notifyOrgMembers(
      b.organizationId,
      {
        type: "booking.completion-reminder",
        title: "Boeking afronden",
        body: `De boeking van ${b.customer.name} (${b.item.name}) is voorbij — vergeet niet 'm op voltooid te zetten.`,
        ctaUrl: `/dashboard/bookings/${b.id}`,
        ctaLabel: "Afronden",
      },
      // Dedup op booking-id zodat de cron de volgende dag niet nogmaals
      // dezelfde reminder stuurt.
      `/dashboard/bookings/${b.id}`,
    );
    if (result.recipients > 0) notified++;
  }

  return { stale: stale.length, notified };
}

// ── 3. Klant-email-reminder (12-36u vóór startAt) ────────────────────────

async function runKlantEmailReminder() {
  const now = new Date();
  const in12h = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  const in36h = new Date(now.getTime() + 36 * 60 * 60 * 1000);

  const upcoming = await db.booking.findMany({
    where: {
      startAt: { gte: in12h, lte: in36h },
      status: { in: ["CONFIRMED", "IN_PROGRESS"] },
      customerReminderSentAt: null,
      customer: { email: { not: null } },
    },
    select: {
      id: true,
      organizationId: true,
      startAt: true,
      endAt: true,
      customer: { select: { name: true, email: true } },
      item: { select: { name: true } },
      organization: { select: { name: true, slug: true, contactPhone: true, contactEmail: true } },
    },
  });

  let sent = 0;
  let failed = 0;
  for (const b of upcoming) {
    if (!b.customer.email) continue;
    const start = format(b.startAt, "EEEE d MMMM 'om' HH:mm", { locale: nl });
    const end = format(b.endAt, "HH:mm", { locale: nl });
    const contact =
      b.organization.contactPhone || b.organization.contactEmail
        ? `Heb je een vraag? ${
            b.organization.contactPhone
              ? `Bel ${b.organization.contactPhone}`
              : `Mail ${b.organization.contactEmail}`
          }.`
        : "";

    const result = await sendEmail({
      to: b.customer.email,
      subject: `Herinnering: ${b.item.name} morgen om ${format(b.startAt, "HH:mm")}`,
      html: emailLayout(`
        <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600">Tot morgen, ${b.customer.name}!</h1>
        <p style="margin:0 0 12px 0">
          Even een korte herinnering: je hebt <strong>${b.item.name}</strong>
          geboekt bij <strong>${b.organization.name}</strong>.
        </p>
        <p style="margin:0 0 8px 0"><strong>Wanneer:</strong> ${start} — tot ${end}</p>
        ${contact ? `<p style="margin:16px 0 0 0">${contact}</p>` : ""}
      `),
      text: `Tot morgen ${b.customer.name}! Je hebt ${b.item.name} geboekt bij ${b.organization.name} op ${start} tot ${end}.`,
    });

    if (result.ok) {
      await db.booking.update({
        where: { id: b.id },
        data: { customerReminderSentAt: new Date() },
      });
      await audit({
        organizationId: b.organizationId,
        action: "booking.customer-reminder.sent",
        resource: "booking",
        resourceId: b.id,
        metadata: { to: b.customer.email },
      });
      sent++;
    } else {
      failed++;
    }
  }

  return { eligible: upcoming.length, sent, failed };
}

// ── 4. Auto review-uitvraag (X dagen na voltooid) ────────────────────────

async function runReviewRequests() {
  const now = new Date();
  // Window van 14 dagen terug zodat een gefaalde cron-run zich kan
  // herstellen — completedAt-based, dus we missen nooit een booking
  // die intussen voltooid raakte.
  const windowStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const eligible = await db.booking.findMany({
    where: {
      completedAt: { gte: windowStart, lte: now },
      reviewRequestedAt: null,
      customer: { email: { not: null } },
      organization: {
        reviewRequestEnabled: true,
        reviewRequestUrl: { not: null },
      },
    },
    select: {
      id: true,
      organizationId: true,
      completedAt: true,
      customer: { select: { name: true, email: true } },
      item: { select: { name: true } },
      organization: {
        select: {
          name: true,
          reviewRequestUrl: true,
          reviewRequestDelayDays: true,
        },
      },
    },
  });

  let sent = 0;
  let failed = 0;
  let skippedTooSoon = 0;

  for (const b of eligible) {
    if (!b.completedAt || !b.customer.email || !b.organization.reviewRequestUrl) continue;
    const delayMs = b.organization.reviewRequestDelayDays * 24 * 60 * 60 * 1000;
    const eligibleAt = new Date(b.completedAt.getTime() + delayMs);
    if (now < eligibleAt) {
      skippedTooSoon++;
      continue;
    }

    const result = await sendEmail({
      to: b.customer.email,
      subject: `Hoe was het bij ${b.organization.name}?`,
      html: emailLayout(`
        <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600">Hoi ${b.customer.name},</h1>
        <p style="margin:0 0 12px 0">
          Bedankt dat je <strong>${b.item.name}</strong> bij
          <strong>${b.organization.name}</strong> hebt gehuurd. We zijn benieuwd
          hoe het was.
        </p>
        <p style="margin:0 0 24px 0">Heb je 30 seconden? Laat een review achter:</p>
        <p style="margin:24px 0">
          <a href="${b.organization.reviewRequestUrl}" style="display:inline-block;background:#ef5934;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px">
            Laat een review achter
          </a>
        </p>
      `),
      text: `Hoi ${b.customer.name}, bedankt voor je boeking van ${b.item.name} bij ${b.organization.name}. Laat een review achter: ${b.organization.reviewRequestUrl}`,
    });

    if (result.ok) {
      await db.booking.update({
        where: { id: b.id },
        data: { reviewRequestedAt: new Date() },
      });
      await audit({
        organizationId: b.organizationId,
        action: "booking.review-request.sent",
        resource: "booking",
        resourceId: b.id,
        metadata: { to: b.customer.email, url: b.organization.reviewRequestUrl },
      });
      sent++;
    } else {
      failed++;
    }
  }

  return { candidates: eligible.length, sent, failed, skippedTooSoon };
}
