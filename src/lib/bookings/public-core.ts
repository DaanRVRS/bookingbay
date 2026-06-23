import "server-only";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { checkAvailability } from "./conflicts";
import { audit } from "@/lib/audit/log";
import { publicBookingSchema, type PublicBookingInput } from "./public-schemas";
import { syncBookingExternal } from "@/lib/integrations/sync-booking";
import { env } from "@/lib/env";
import { readPaymentConfig, onlineReady } from "@/lib/payments/config";
import { createMolliePaymentForBooking } from "@/lib/payments/tenant-mollie";
import { createStripeCheckoutForBooking } from "@/lib/payments/tenant-stripe";
import { notifyOrgMembers } from "@/lib/notifications/send";
import {
  estimateRentalSubtotal,
  sumAddons,
  addonAppliesToCategory,
  isWholeDayUnit,
  type BookingAddonLine,
} from "./price";
import { windowForDay } from "./slot-window";
import {
  safeParseBusinessHours,
  type BusinessHours,
} from "@/lib/business-hours/schemas";
import { sendBookingConfirmationMail } from "@/lib/portal/confirmation-mail";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { randomBytes } from "node:crypto";

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
    select: {
      id: true,
      suspendedAt: true,
      businessHours: true,
    },
  });
  if (!org) return { ok: false, error: "Organisatie niet gevonden" };
  if (org.suspendedAt) {
    return {
      ok: false,
      error: "Deze verhuurder accepteert momenteel geen online boekingen.",
    };
  }

  // isAddon: false — extra's zijn nooit zelfstandig boekbaar, ook niet via
  // een directe API-call met het add-on-itemId.
  const item = await db.item.findFirst({
    where: { id: data.itemId, organizationId: org.id, isActive: true, isAddon: false },
    select: {
      id: true,
      name: true,
      quantity: true,
      categoryId: true,
      category: { select: { parentId: true } },
      pricePerUnit: true,
      bookingIntervalMinutes: true,
      followsOrgHours: true,
      cleaningFee: true,
    },
  });
  if (!item) {
    return { ok: false, error: "Item niet gevonden", fieldErrors: { itemId: "Onbekend item" } };
  }

  const startAt = new Date(data.startAt);
  const endAt = new Date(data.endAt);

  // Server-side guards. De widget dwingt deze client-side al af, maar een
  // directe API-call mag niet in het verleden of absurd ver vooruit boeken.
  const nowMs = Date.now();
  if (startAt.getTime() < nowMs) {
    return {
      ok: false,
      error: "Je kunt niet in het verleden boeken",
      fieldErrors: { startAt: "Deze tijd is al geweest" },
    };
  }
  if (startAt.getTime() > nowMs + AVAILABILITY_LOOKAHEAD_DAYS * 86_400_000) {
    return {
      ok: false,
      error: `Boekingen kunnen maximaal ${AVAILABILITY_LOOKAHEAD_DAYS} dagen vooruit`,
      fieldErrors: { startAt: "Te ver in de toekomst" },
    };
  }

  // Volgt het item de organisatie-openingstijden, dan mag er niet op een
  // gesloten weekdag geboekt worden. De widget verbergt die dag al; dit
  // blokkeert ook directe API-calls. Alleen voor tijd-eenheden — dag/week-
  // items boeken hele dagen, los van openingstijden. We checken alleen of de
  // dag open is (niet de exacte uren), zodat tijdzone-randgevallen geen
  // geldige boeking weigeren.
  if (!isWholeDayUnit(item.bookingIntervalMinutes) && item.followsOrgHours) {
    const dayWindow = windowForDay(startAt, {
      windowStartMin: 0,
      windowEndMin: 1440,
      followsOrgHours: true,
      orgHours: safeParseBusinessHours(org.businessHours),
    });
    if (!dayWindow) {
      return {
        ok: false,
        error: "Dit item is niet boekbaar op de gekozen dag.",
        fieldErrors: { startAt: "Gesloten op deze dag" },
      };
    }
  }

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

  // Zelfde gedeelde functie als de widget (PublicBookingForm) zodat het
  // gecharchde bedrag exact matcht met wat de klant zag — incl. weektarief.
  const rentalSubtotal = estimateRentalSubtotal({
    startMs: startAt.getTime(),
    endMs: endAt.getTime(),
    pricePerUnit: item.pricePerUnit ? Number(item.pricePerUnit) : null,
    bookingIntervalMinutes: item.bookingIntervalMinutes,
  });
  let estimate = rentalSubtotal ?? 0;

  // Schoonmaakkosten — flat fee per item bovenop de huurprijs. Null/0 = uit.
  // Alléén optellen als er een echte huurprijs is: een item zonder
  // pricePerUnit (prijs op aanvraag) rekent niets, exact zoals de widget
  // toont — anders zou de klant €0 zien maar tóch de schoonmaak betalen.
  const cleaningFee = item.cleaningFee ? Number(item.cleaningFee) : 0;
  if (rentalSubtotal != null && cleaningFee > 0) {
    estimate = estimate + cleaningFee;
  }

  // Add-ons (extra's): prijs + naam ALTIJD server-side ophalen uit het
  // add-on-item — nooit de client vertrouwen. Alleen actieve isAddon-items
  // van deze org met een geldige prijs tellen mee. Snapshot wordt op de
  // boeking bewaard zodat de regel klopt ook als het item later wijzigt.
  const addonLines: BookingAddonLine[] = [];
  const requestedAddons = (data.addons ?? []).filter((a) => a.quantity > 0);
  if (requestedAddons.length > 0) {
    // Categorie-scope: add-on moet gelden voor de categorie van het hoofd-
    // item (of diens parent). Niet-passende add-ons vallen er stil uit.
    const itemCategoryIds = [item.categoryId, item.category.parentId].filter(
      (v): v is string => Boolean(v),
    );
    const addonItems = await db.item.findMany({
      where: {
        id: { in: requestedAddons.map((a) => a.itemId) },
        organizationId: org.id,
        isActive: true,
        isAddon: true,
        addonPrice: { not: null },
      },
      select: { id: true, name: true, addonPrice: true, addonCategoryIds: true },
    });
    const byId = new Map(addonItems.map((a) => [a.id, a]));
    for (const req of requestedAddons) {
      const it = byId.get(req.itemId);
      if (!it || it.addonPrice == null) continue;
      const scope = Array.isArray(it.addonCategoryIds)
        ? (it.addonCategoryIds as string[])
        : null;
      if (!addonAppliesToCategory(scope, itemCategoryIds)) continue;
      addonLines.push({
        itemId: it.id,
        name: it.name,
        unitPrice: Number(it.addonPrice),
        quantity: req.quantity,
      });
    }
    estimate = estimate + sumAddons(addonLines);
  }

  // Pre-authenticated portal-token. Mailen we mee in de bevestiging
  // zodat de klant z'n boeking-pagina direct kan openen — geen login.
  const portalToken = randomBytes(32).toString("hex");

  // Race-vrije definitieve check + create. Een Serializable-transactie zorgt
  // dat twee gelijktijdige requests voor hetzelfde slot niet allebei kunnen
  // inserten: Postgres SSI detecteert de write-skew → één faalt (P2034) en
  // wordt hier als "net te laat" afgehandeld i.p.v. een dubbelboeking. De
  // losse pre-check hierboven blijft voor snelle, nette UX-feedback.
  const CONFLICT = "BOOKING_SLOT_TAKEN";
  let booking: { id: string };
  try {
    booking = await db.$transaction(
      async (tx) => {
        const [overlap, blocked] = await Promise.all([
          tx.booking.count({
            where: {
              itemId: item.id,
              organizationId: org.id,
              status: { not: "CANCELED" },
              startAt: { lt: endAt },
              endAt: { gt: startAt },
            },
          }),
          tx.calendarBlock.count({
            where: {
              organizationId: org.id,
              startAt: { lt: endAt },
              endAt: { gt: startAt },
              OR: [{ itemId: item.id }, { itemId: null }],
            },
          }),
        ]);
        if (overlap + blocked >= Math.max(1, item.quantity)) {
          throw new Error(CONFLICT);
        }
        return tx.booking.create({
          data: {
            organizationId: org.id,
            itemId: item.id,
            customerId: customer.id,
            startAt,
            endAt,
            status: "PENDING",
            totalPrice: estimate,
            notes: data.notes?.trim() || null,
            addons:
              addonLines.length > 0
                ? (addonLines as unknown as Prisma.InputJsonValue)
                : undefined,
            portalToken,
          },
          select: { id: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (err) {
    if (err instanceof Error && err.message === CONFLICT) {
      return { ok: false, error: "Net te laat — dit tijdslot is zojuist geboekt." };
    }
    // Postgres serialisatie-conflict: een gelijktijdige boeking won de race.
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "P2034"
    ) {
      return { ok: false, error: "Net te laat — probeer een ander tijdslot." };
    }
    throw err;
  }

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

  // Online betaling — vóór de notif/mail zodat we bij een mislukte checkout
  // een eerlijke fout kunnen geven i.p.v. de klant valselijk "bevestigd" te
  // tonen. "location" = betalen bij ophalen → boeking blijft gewoon PENDING.
  let redirectUrl: string | undefined;
  if (data.paymentChoice === "online" && estimate > 0) {
    try {
      const paymentCfg = await readPaymentConfig(org.id);
      const baseUrl = env.APP_URL.replace(/\/$/, "");
      const successUrl = `${baseUrl}/book/${data.slug}/betaling/${booking.id}?status=ok`;
      const cancelUrl = `${baseUrl}/book/${data.slug}/betaling/${booking.id}?status=annulered`;

      if (paymentCfg.onlineProvider === "MOLLIE" && paymentCfg.mollieKey) {
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
      } else if (paymentCfg.onlineProvider === "STRIPE" && paymentCfg.stripeKey) {
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

    // Online gekozen maar er kwam geen checkout-URL (geen werkende provider,
    // of de creatie faalde): geef een eerlijke fout. De boeking blijft als
    // PENDING staan zodat de verhuurder 'm alsnog ziet.
    if (!redirectUrl) {
      return {
        ok: false,
        error:
          "Online betalen lukte niet. Je boeking is genoteerd; neem contact op met de verhuurder of kies 'betalen op locatie'.",
      };
    }
  }

  // Best-effort vervolgacties — niet de boeking afkappen als deze falen.
  try {
    await syncBookingExternal(booking.id, "upsert");
  } catch (err) {
    console.error("[public-booking] external sync mislukt:", err);
  }

  try {
    const datumLabel = format(startAt, "d MMM, HH:mm", { locale: nl });
    await notifyOrgMembers(org.id, {
      type: "booking.new",
      title: "Nieuwe boeking",
      body: `${data.customerName.trim()} reserveerde ${item.name} op ${datumLabel}.`,
      ctaUrl: `/dashboard/bookings/${booking.id}`,
      ctaLabel: "Bekijk",
    });
  } catch (err) {
    console.error("[public-booking] notif fan-out mislukt:", err);
  }

  // Confirmation mail naar de klant met de pre-authenticated portal-link.
  // No-op als customerPortalEnabled uit staat — tenant kiest of dit gebeurt.
  try {
    await sendBookingConfirmationMail(booking.id);
  } catch (err) {
    console.error("[public-booking] confirmation mail mislukt:", err);
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
  followsOrgHours: boolean;
  /** Org-openingstijden (ma..zo) als het item deze volgt — anders null. */
  orgHours: BusinessHours | null;
  bookings: { startMs: number; endMs: number }[];
  /** Externe agenda-blokken (Google Calendar etc.) — de slot-grid moet
   *  deze ook als bezet tonen, anders weigert de backend later. */
  blocks: { startMs: number; endMs: number }[];
  /** Tenant accepteert betalen op locatie. */
  locationPaymentAvailable: boolean;
  /** Tenant heeft werkende online betaling (provider + key). */
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
    select: { id: true, businessHours: true },
  });
  if (!org) return { ok: false, error: "Organisatie niet gevonden" };

  const item = await db.item.findFirst({
    where: { id: itemId, organizationId: org.id, isActive: true, isAddon: false },
    select: {
      quantity: true,
      bookingIntervalMinutes: true,
      bookingWindowStartMin: true,
      bookingWindowEndMin: true,
      followsOrgHours: true,
    },
  });
  if (!item) return { ok: false, error: "Item niet gevonden" };

  const paymentCfg = await readPaymentConfig(org.id);
  const onlinePaymentAvailable = onlineReady(paymentCfg);
  const locationPaymentAvailable = paymentCfg.acceptLocation;

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
  const cursor = new Date(fromDate);

  // Beschikbaarheid per dag wordt berekend BINNEN het boekvenster van die dag,
  // niet over de hele 24u — anders telt vrije tijd buiten openingstijden mee.
  // Dag/week-eenheden gebruiken het hele etmaal. Voor tijd-eenheden komt het
  // venster óf van de organisatie-openingstijden (per weekdag; gesloten =
  // niet boekbaar) óf van het eigen venster. windowForDay is gedeeld met de
  // widget zodat de getoonde slots exact matchen met deze berekening.
  const isWholeDay = isWholeDayUnit(item.bookingIntervalMinutes);
  const orgHours = isWholeDay ? null : safeParseBusinessHours(org.businessHours);
  const windowCfg = {
    windowStartMin: item.bookingWindowStartMin,
    windowEndMin: item.bookingWindowEndMin,
    followsOrgHours: item.followsOrgHours,
    orgHours,
  };

  while (cursor < toDate) {
    const y = cursor.getFullYear();
    const mo = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    const dateStr = `${y}-${mo}-${d}`;
    const dayStart = cursor.getTime();

    let winStartMin: number;
    let winEndMin: number;
    if (isWholeDay) {
      winStartMin = 0;
      winEndMin = 1440;
    } else {
      const w = windowForDay(cursor, windowCfg);
      // Gesloten dag, óf venster te kort voor zelfs één slot → niet boekbaar.
      // Dit moet de client-kant (dayHasFreeSlot: m+interval<=eind) spiegelen,
      // anders toont het dashboard een dag als vrij die geen kiesbaar slot
      // heeft.
      if (!w || w.endMin - w.startMin < item.bookingIntervalMinutes) {
        unavailable.push(dateStr);
        cursor.setDate(cursor.getDate() + 1);
        continue;
      }
      winStartMin = w.startMin;
      winEndMin = w.endMin;
    }
    const winStart = dayStart + winStartMin * 60_000;
    const winEnd = dayStart + winEndMin * 60_000;

    const events: { time: number; delta: number }[] = [];
    for (const b of occupiers) {
      const overlapStart = Math.max(b.startAt.getTime(), winStart);
      const overlapEnd = Math.min(b.endAt.getTime(), winEnd);
      if (overlapStart < overlapEnd) {
        events.push({ time: overlapStart, delta: 1 });
        events.push({ time: overlapEnd, delta: -1 });
      }
    }

    if (events.length > 0 && winEnd > winStart) {
      events.sort((a, b) => a.time - b.time);
      let concurrent = 0;
      let lastTime = winStart;
      let availableMs = 0;
      for (const e of events) {
        if (concurrent < item.quantity) availableMs += e.time - lastTime;
        concurrent += e.delta;
        lastTime = e.time;
      }
      if (concurrent < item.quantity) availableMs += winEnd - lastTime;

      if (availableMs < 60_000) {
        unavailable.push(dateStr);
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
    followsOrgHours: item.followsOrgHours,
    orgHours,
    bookings: bookings.map((b) => ({
      startMs: b.startAt.getTime(),
      endMs: b.endAt.getTime(),
    })),
    blocks: blocks.map((b) => ({
      startMs: b.startAt.getTime(),
      endMs: b.endAt.getTime(),
    })),
    locationPaymentAvailable,
    onlinePaymentAvailable,
  };
}
