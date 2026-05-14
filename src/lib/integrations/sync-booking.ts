import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  deleteBookingEvent,
  safeSync,
  upsertBookingEvent,
} from "./google-calendar";

/**
 * Centrale "sync deze boeking naar alle gekoppelde providers"-helper.
 * Wordt aangeroepen vanuit alle booking-server-actions (create / update /
 * cancel / move / status-change). Mislukkingen worden gelogd maar gooien
 * nooit — we willen nooit dat een Google API-storing een normale
 * boeking blokkeert.
 *
 * Bij `delete` proberen we het bestaande event te verwijderen; bij elke
 * andere mutatie upserten we (insert of update). Voor CANCELED bookings
 * verwijderen we het event en clearen de ref.
 */
export async function syncBookingExternal(
  bookingId: string,
  mode: "upsert" | "delete" = "upsert",
): Promise<void> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      organizationId: true,
      startAt: true,
      endAt: true,
      status: true,
      notes: true,
      externalRefs: true,
      item: { select: { name: true, integrationConfig: true } },
      customer: { select: { name: true, email: true } },
    },
  });
  if (!booking) return;

  // Per-item calendar override (uit Item.integrationConfig). Null = val
  // terug op org-default.
  const itemCfg =
    (booking.item.integrationConfig as Record<string, unknown> | null) ?? null;
  const itemGcCfg =
    (itemCfg?.googleCalendar as { calendarId?: string } | undefined) ?? undefined;
  const calendarIdOverride = itemGcCfg?.calendarId ?? null;

  const gcal = await db.orgIntegration.findUnique({
    where: {
      organizationId_integrationKey: {
        organizationId: booking.organizationId,
        integrationKey: "google-calendar",
      },
    },
    select: { status: true },
  });
  if (!gcal || gcal.status !== "ACTIVE") return;

  const refs = (booking.externalRefs ?? {}) as Record<string, unknown>;
  const gcRef =
    (refs.googleCalendar as { eventId?: string; calendarId?: string } | undefined) ??
    {};
  const existingEventId = gcRef.eventId ?? null;
  const existingEventCalendarId = gcRef.calendarId ?? null;

  // CANCELED of expliciet delete → event weg, ref clearen.
  if (mode === "delete" || booking.status === "CANCELED") {
    if (existingEventId) {
      await safeSync(booking.organizationId, () =>
        deleteBookingEvent(
          booking.organizationId,
          existingEventId,
          existingEventCalendarId,
        ),
      );
      const newRefs = { ...refs };
      delete (newRefs as Record<string, unknown>).googleCalendar;
      await db.booking.update({
        where: { id: booking.id },
        data: {
          externalRefs: (Object.keys(newRefs).length
            ? newRefs
            : {}) as Prisma.InputJsonValue,
        },
      });
    }
    return;
  }

  // Als de gekozen calendar is gewijzigd (per-item override of org-default
  // wijziging), eerst het oude event op de oude calendar opruimen zodat we
  // geen orphan-event laten staan.
  let effectiveExistingEventId = existingEventId;
  if (
    existingEventId &&
    existingEventCalendarId &&
    calendarIdOverride &&
    existingEventCalendarId !== calendarIdOverride
  ) {
    await safeSync(booking.organizationId, () =>
      deleteBookingEvent(
        booking.organizationId,
        existingEventId,
        existingEventCalendarId,
      ),
    );
    // Reset zodat upsert hieronder een nieuw event op de nieuwe calendar
    // aanmaakt ipv een PATCH te proberen die toch 404 zou geven.
    effectiveExistingEventId = null;
  }

  const summary = `${booking.item.name} — ${booking.customer.name}`;
  const description = [
    `BookingBay-boeking #${booking.id.slice(-8)}`,
    booking.notes ? `\n${booking.notes}` : "",
  ].join("");

  const upsertResult = await safeSync(booking.organizationId, () =>
    upsertBookingEvent({
      organizationId: booking.organizationId,
      bookingId: booking.id,
      summary,
      description,
      startAt: booking.startAt,
      endAt: booking.endAt,
      attendeeEmail: booking.customer.email ?? undefined,
      attendeeName: booking.customer.name,
      existingEventId: effectiveExistingEventId,
      calendarIdOverride,
    }),
  );

  // Sla event-id én calendarId op zodat we 'm later op de juiste calendar
  // kunnen vinden — ook als de admin daarna de mapping wijzigt.
  if (
    upsertResult &&
    upsertResult.eventId &&
    (upsertResult.eventId !== existingEventId ||
      upsertResult.calendarId !== existingEventCalendarId)
  ) {
    await db.booking.update({
      where: { id: booking.id },
      data: {
        externalRefs: {
          ...refs,
          googleCalendar: {
            eventId: upsertResult.eventId,
            calendarId: upsertResult.calendarId,
          },
        } as Prisma.InputJsonValue,
      },
    });
  }
}
