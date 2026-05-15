"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { checkAvailability } from "./conflicts";
import { audit } from "@/lib/audit/log";
import { publicBookingSchema, type PublicBookingInput } from "./public-schemas";
import type { ActionResult } from "@/lib/auth/schemas";
import { syncBookingExternal } from "@/lib/integrations/sync-booking";
import { env } from "@/lib/env";
import { readPaymentConfig } from "@/lib/payments/config";
import { createMolliePaymentForBooking } from "@/lib/payments/tenant-mollie";
import { createStripeCheckoutForBooking } from "@/lib/payments/tenant-stripe";

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const path = i.path.join(".");
    if (!out[path]) out[path] = i.message;
  }
  return out;
}

export async function createPublicBookingAction(
  input: PublicBookingInput,
): Promise<ActionResult<{ id: string; redirectUrl?: string }>> {
  try {
    return await createPublicBookingActionInner(input);
  } catch (err) {
    // Public widget mag NOOIT een 500-page tonen aan bezoekers — vang alle
    // unexpected throws hier af en log naar pm2 voor diagnose.
    console.error("[public-booking] uncaught error in action:", err);
    return {
      ok: false,
      error: "Er ging iets mis bij het aanmaken van je boeking. Probeer 't opnieuw.",
    };
  }
}

async function createPublicBookingActionInner(
  input: PublicBookingInput,
): Promise<ActionResult<{ id: string; redirectUrl?: string }>> {
  const parsed = publicBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }

  const data = parsed.data;

  const org = await db.organization.findUnique({
    where: { slug: data.slug },
    select: { id: true, suspendedAt: true },
  });
  if (!org) return { ok: false, error: "Organisatie niet gevonden" };
  if (org.suspendedAt) {
    return {
      ok: false,
      error: "Deze verhuurder accepteert momenteel geen online boekingen.",
    };
  }

  const item = await db.item.findFirst({
    where: { id: data.itemId, organizationId: org.id, isActive: true },
    select: { id: true, quantity: true, pricePerDay: true, pricePerHour: true },
  });
  if (!item) {
    return { ok: false, error: "Item niet gevonden", fieldErrors: { itemId: "Onbekend item" } };
  }

  const startAt = new Date(data.startAt);
  const endAt = new Date(data.endAt);

  const availability = await checkAvailability({
    organizationId: org.id,
    itemId: item.id,
    itemQuantity: item.quantity,
    startAt,
    endAt,
  });
  if (!availability.available) {
    return { ok: false, error: availability.message ?? "Niet beschikbaar in deze periode" };
  }

  const emailLower = data.customerEmail.trim().toLowerCase();
  const phone = data.customerPhone?.trim() || null;

  // Find existing customer by email within this org, else create new.
  let customer = await db.customer.findFirst({
    where: { organizationId: org.id, email: emailLower },
    select: { id: true },
  });
  if (!customer) {
    customer = await db.customer.create({
      data: {
        organizationId: org.id,
        name: data.customerName.trim(),
        email: emailLower,
        phone,
      },
      select: { id: true },
    });
  }

  // Estimate price from item's day-price × duration in days (ceil),
  // falling back to hour-price × hours, else 0. Tenant adjusts on confirm.
  const durationMs = endAt.getTime() - startAt.getTime();
  const days = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
  const hours = Math.ceil(durationMs / (1000 * 60 * 60));
  let estimate = 0;
  if (item.pricePerDay) {
    estimate = Number(item.pricePerDay) * days;
  } else if (item.pricePerHour) {
    estimate = Number(item.pricePerHour) * hours;
  }

  const booking = await db.booking.create({
    data: {
      organizationId: org.id,
      itemId: item.id,
      customerId: customer.id,
      startAt,
      endAt,
      status: "PENDING",
      totalPrice: estimate,
      notes: data.notes?.trim() || null,
    },
    select: { id: true },
  });

  await audit({
    organizationId: org.id,
    action: "booking.create",
    resource: "booking",
    resourceId: booking.id,
    metadata: {
      source: "public-widget",
      itemId: item.id,
      customerId: customer.id,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
    },
  });

  // Push naar Google Calendar etc. (best-effort) — mag NOOIT de boeking
  // breken. syncBookingExternal heeft interne safeSync-wrappers, maar als
  // er bij DB-reads of imports iets misgaat zou een uncaught throw alsnog
  // 500 geven — vandaar deze extra catch.
  try {
    await syncBookingExternal(booking.id, "upsert");
  } catch (err) {
    console.error("[public-booking] external sync mislukt:", err);
  }

  // Online betaal-flow: als de tenant Mollie of Stripe ingesteld heeft, maak
  // direct een payment aan en geef de checkout-URL terug. Bij faal: boeking
  // blijft staan als UNPAID — tenant kan later handmatig confirmen of zelf
  // een payment-link sturen. We willen niet failen op de boeking zelf.
  let redirectUrl: string | undefined;
  if (estimate > 0) {
    try {
      const paymentCfg = await readPaymentConfig(org.id);
      const baseUrl = env.APP_URL.replace(/\/$/, "");
      const successUrl = `${baseUrl}/book/${data.slug}/betaling/${booking.id}?status=ok`;
      const cancelUrl = `${baseUrl}/book/${data.slug}/betaling/${booking.id}?status=annulered`;

      if (paymentCfg.provider === "MOLLIE" && paymentCfg.mollieKey) {
        const webhookUrl = `${baseUrl}/api/payments/mollie/webhook`;
        const result = await createMolliePaymentForBooking({
          apiKey: paymentCfg.mollieKey,
          amountEuro: estimate,
          description: `Boeking ${item.id.slice(-6)}`,
          redirectUrl: successUrl,
          webhookUrl,
          bookingId: booking.id,
        });
        await db.booking.update({
          where: { id: booking.id },
          data: {
            paymentStatus: "UNPAID",
            paymentProvider: "mollie",
            paymentRef: result.paymentId,
          },
        });
        redirectUrl = result.checkoutUrl;
      } else if (paymentCfg.provider === "STRIPE" && paymentCfg.stripeKey) {
        const result = await createStripeCheckoutForBooking({
          apiKey: paymentCfg.stripeKey,
          amountEuro: estimate,
          description: `Boeking ${item.id.slice(-6)}`,
          successUrl,
          cancelUrl,
          bookingId: booking.id,
        });
        await db.booking.update({
          where: { id: booking.id },
          data: {
            paymentStatus: "UNPAID",
            paymentProvider: "stripe",
            paymentRef: result.sessionId,
          },
        });
        redirectUrl = result.checkoutUrl;
      }
    } catch (err) {
      console.error("[public-booking] payment-create mislukt:", err);
      // Boeking blijft staan — tenant ziet 'm in dashboard en kan handmatig
      // afhandelen. Voor de bezoeker doen we alsof het normale "op locatie"-flow
      // is zodat ze niet met een rode error blijven zitten.
    }
  }

  return {
    ok: true,
    data: { id: booking.id, redirectUrl },
  };
}

const AVAILABILITY_LOOKAHEAD_DAYS = 180;

/**
 * Returns the list of dates (yyyy-MM-dd) within the next AVAILABILITY_LOOKAHEAD_DAYS
 * where the item is fully booked — meaning no minute of the day has fewer than
 * `quantity` concurrent bookings. Used by the public widget calendar to mark
 * red/green vakjes.
 */
interface BookingInterval {
  startMs: number;
  endMs: number;
}

interface ItemAvailabilityOk {
  ok: true;
  unavailableDates: string[];
  lookaheadDays: number;
  quantity: number;
  bookingIntervalMinutes: number;
  bookingWindowStartMin: number;
  bookingWindowEndMin: number;
  bookings: BookingInterval[];
}

export async function getItemAvailabilityAction(input: {
  slug: string;
  itemId: string;
}): Promise<ItemAvailabilityOk | { ok: false; error: string }> {
  const slug = String(input.slug ?? "").trim();
  const itemId = String(input.itemId ?? "").trim();
  if (!slug || !itemId) {
    return { ok: false, error: "Ontbrekende parameters" };
  }

  const org = await db.organization.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!org) return { ok: false, error: "Organisatie niet gevonden" };

  const item = await db.item.findFirst({
    where: { id: itemId, organizationId: org.id, isActive: true },
    select: {
      quantity: true,
      bookingIntervalMinutes: true,
      bookingWindowStartMin: true,
      bookingWindowEndMin: true,
    },
  });
  if (!item) return { ok: false, error: "Item niet gevonden" };

  const fromDate = new Date();
  fromDate.setHours(0, 0, 0, 0);
  const toDate = new Date(fromDate);
  toDate.setDate(toDate.getDate() + AVAILABILITY_LOOKAHEAD_DAYS);

  const [bookings, blocks] = await Promise.all([
    db.booking.findMany({
      where: {
        itemId,
        organizationId: org.id,
        status: { not: "CANCELED" },
        startAt: { lt: toDate },
        endAt: { gt: fromDate },
      },
      select: { startAt: true, endAt: true },
    }),
    // Externe blokken (Google Calendar etc.) — tellen ook mee tegen
    // beschikbaarheid. itemId=null = blokt alle items op die calendar.
    db.calendarBlock.findMany({
      where: {
        organizationId: org.id,
        startAt: { lt: toDate },
        endAt: { gt: fromDate },
        OR: [{ itemId }, { itemId: null }],
      },
      select: { startAt: true, endAt: true },
    }),
  ]);
  const occupiers = [...bookings, ...blocks];

  const unavailable: string[] = [];
  const dayMs = 86_400_000;
  const cursor = new Date(fromDate);

  while (cursor < toDate) {
    const dayStart = cursor.getTime();
    const dayEnd = dayStart + dayMs;

    // Build sweep events for this day, clamped to [dayStart, dayEnd]
    const events: { time: number; delta: number }[] = [];
    for (const b of occupiers) {
      const bStart = b.startAt.getTime();
      const bEnd = b.endAt.getTime();
      const overlapStart = Math.max(bStart, dayStart);
      const overlapEnd = Math.min(bEnd, dayEnd);
      if (overlapStart < overlapEnd) {
        events.push({ time: overlapStart, delta: 1 });
        events.push({ time: overlapEnd, delta: -1 });
      }
    }

    if (events.length > 0) {
      events.sort((a, b) => a.time - b.time);

      let concurrent = 0;
      let lastTime = dayStart;
      let availableMs = 0;

      for (const e of events) {
        if (concurrent < item.quantity) {
          availableMs += e.time - lastTime;
        }
        concurrent += e.delta;
        lastTime = e.time;
      }
      if (concurrent < item.quantity) {
        availableMs += dayEnd - lastTime;
      }

      // Day is "red" if essentially no minute is bookable.
      if (availableMs < 60_000) {
        const y = cursor.getFullYear();
        const m = String(cursor.getMonth() + 1).padStart(2, "0");
        const d = String(cursor.getDate()).padStart(2, "0");
        unavailable.push(`${y}-${m}-${d}`);
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    ok: true,
    unavailableDates: unavailable,
    lookaheadDays: AVAILABILITY_LOOKAHEAD_DAYS,
    quantity: item.quantity,
    bookingIntervalMinutes: item.bookingIntervalMinutes,
    bookingWindowStartMin: item.bookingWindowStartMin,
    bookingWindowEndMin: item.bookingWindowEndMin,
    bookings: bookings.map((b) => ({
      startMs: b.startAt.getTime(),
      endMs: b.endAt.getTime(),
    })),
  };
}
