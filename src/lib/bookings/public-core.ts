import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkAvailability } from "./conflicts";
import { audit } from "@/lib/audit/log";
import { publicBookingSchema, type PublicBookingInput } from "./public-schemas";
import { syncBookingExternal } from "@/lib/integrations/sync-booking";
import { env } from "@/lib/env";
import { readPaymentConfig } from "@/lib/payments/config";
import { createMolliePaymentForBooking } from "@/lib/payments/tenant-mollie";
import { createStripeCheckoutForBooking } from "@/lib/payments/tenant-stripe";

/**
 * Plain server-only booking logic — GEEN "use server". Wordt aangeroepen
 * vanuit de publieke API-routes (/api/public/*). Bewust GEEN Server Actions:
 * een embedbare widget over meerdere domeinen + iframes + frequente deploys
 * is precies waar Next.js Server Actions breken ("Failed to find Server
 * Action" door action-ID version-skew). Een gewone API-route heeft een
 * stabiele URL en is deploy-onafhankelijk.
 */

export type PublicBookingResult =
  | { ok: true; id: string; redirectUrl?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const path = i.path.join(".");
    if (!out[path]) out[path] = i.message;
  }
  return out;
}

export async function createPublicBooking(
  input: PublicBookingInput,
): Promise<PublicBookingResult> {
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

  try {
    await syncBookingExternal(booking.id, "upsert");
  } catch (err) {
    console.error("[public-booking] external sync mislukt:", err);
  }

  let redirectUrl: string | undefined;
  // Alleen online afrekenen als de klant daar expliciet voor koos én er
  // een bedrag is. "location" = betalen bij ophalen → boeking blijft PENDING.
  if (data.paymentChoice === "online" && estimate > 0) {
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
    }
  }

  return { ok: true, id: booking.id, redirectUrl };
}

const AVAILABILITY_LOOKAHEAD_DAYS = 180;

export interface ItemAvailability {
  ok: true;
  unavailableDates: string[];
  lookaheadDays: number;
  quantity: number;
  bookingIntervalMinutes: number;
  bookingWindowStartMin: number;
  bookingWindowEndMin: number;
  bookings: { startMs: number; endMs: number }[];
  /** Of de tenant online betalen aan heeft (Mollie of Stripe key gezet). */
  onlinePaymentAvailable: boolean;
}

export async function getItemAvailability(
  slugRaw: string,
  itemIdRaw: string,
): Promise<ItemAvailability | { ok: false; error: string }> {
  const slug = String(slugRaw ?? "").trim();
  const itemId = String(itemIdRaw ?? "").trim();
  if (!slug || !itemId) return { ok: false, error: "Ontbrekende parameters" };

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

  const paymentCfg = await readPaymentConfig(org.id);
  const onlinePaymentAvailable =
    (paymentCfg.provider === "MOLLIE" && Boolean(paymentCfg.mollieKey)) ||
    (paymentCfg.provider === "STRIPE" && Boolean(paymentCfg.stripeKey));

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

    const events: { time: number; delta: number }[] = [];
    for (const b of occupiers) {
      const overlapStart = Math.max(b.startAt.getTime(), dayStart);
      const overlapEnd = Math.min(b.endAt.getTime(), dayEnd);
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
        if (concurrent < item.quantity) availableMs += e.time - lastTime;
        concurrent += e.delta;
        lastTime = e.time;
      }
      if (concurrent < item.quantity) availableMs += dayEnd - lastTime;

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
    onlinePaymentAvailable,
  };
}
