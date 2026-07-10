import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import {
  isCancelledEvent,
  isOwnBookingEvent,
  listEventsForSync,
  stopWatchChannel,
  watchCalendar,
} from "./google-calendar";

/**
 * Eén bron van waarheid voor "trek de events van Google → BookingBay":
 *
 *   syncCalendarFromGoogle:
 *     Doet één pull-run met de bestaande syncToken. Bij token-verlopen of
 *     bij eerste keer doet 'ie een full backfill (30d terug, 180d vooruit).
 *     Upserts of deletes CalendarBlock rows.
 *
 *   ensureWatchAndInitialSync:
 *     Garandeert dat er een Google push channel loopt voor deze (org,
 *     calendarId), en triggert direct een eerste sync. Idempotent —
 *     veilig om vaker aan te roepen.
 *
 *   refreshExpiringChannels:
 *     Aangeroepen vanuit cron. Renewt watch-channels die <2 dagen geldig
 *     hebben. Doet ook een vangnet-sync voor stale states.
 *
 *   stopWatchForCalendar:
 *     Cleanup bij ontkoppelen / wisselen van calendar.
 */

const CHANNEL_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // Google max
const RENEWAL_MARGIN_MS = 2 * 24 * 60 * 60 * 1000; // 2 dagen voor afloop
const MAX_FAILURE_COUNT = 5;

/** Welke items mappen op deze calendar? Berekent in-code zodat we niet
 *  in JSON-filter-foefjes hoeven. Org's zijn klein genoeg dat dat prima is. */
async function itemsForCalendar(
  organizationId: string,
  calendarId: string,
  orgDefaultCalendarId: string | null,
): Promise<string[]> {
  const items = await db.item.findMany({
    where: { organizationId },
    select: { id: true, integrationConfig: true },
  });

  const result: string[] = [];
  for (const item of items) {
    const cfg = (item.integrationConfig as Record<string, unknown> | null) ?? null;
    const gc =
      (cfg?.googleCalendar as { calendarId?: string } | undefined) ?? undefined;
    const itemCalendarId = gc?.calendarId;
    if (itemCalendarId) {
      if (itemCalendarId === calendarId) result.push(item.id);
    } else if (orgDefaultCalendarId === calendarId) {
      // Geen override → valt terug op org-default.
      result.push(item.id);
    }
  }
  return result;
}

/**
 * Probeert event te koppelen aan een specifiek item. Als één item op deze
 * calendar mapt → dat item. Bij meerdere items op dezelfde calendar laten
 * we `itemId` null zodat alle items op die calendar de blok zien.
 */
function pickItemIdForBlock(itemIds: string[]): string | null {
  if (itemIds.length === 1) return itemIds[0];
  return null;
}

interface GoogleEventLike {
  id?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  status?: string;
  extendedProperties?: { private?: Record<string, string> };
}

function eventStart(e: GoogleEventLike): Date | null {
  const s = e.start?.dateTime ?? e.start?.date;
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function eventEnd(e: GoogleEventLike): Date | null {
  const s = e.end?.dateTime ?? e.end?.date;
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Trekt events uit Google in via incremental sync (of full backfill bij
 * eerste run / verlopen token) en upsert ze als CalendarBlock-rijen.
 */
export async function syncCalendarFromGoogle(
  organizationId: string,
  calendarId: string,
): Promise<{
  upserted: number;
  deleted: number;
  fullSync: boolean;
  syncTokenInvalid: boolean;
}> {
  const state = await db.calendarSyncState.upsert({
    where: {
      organizationId_integrationKey_calendarId: {
        organizationId,
        integrationKey: "google-calendar",
        calendarId,
      },
    },
    create: {
      organizationId,
      integrationKey: "google-calendar",
      calendarId,
    },
    update: {},
  });

  let result;
  try {
    result = await listEventsForSync({
      organizationId,
      calendarId,
      syncToken: state.syncToken,
    });
  } catch (err) {
    await db.calendarSyncState.update({
      where: { id: state.id },
      data: {
        lastError: err instanceof Error ? err.message.slice(0, 500) : "sync failed",
        failureCount: { increment: 1 },
        lastPolledAt: new Date(),
      },
    });
    throw err;
  }

  // Token verlopen → leeg de syncToken zodat de volgende run een full doet.
  if (result.syncTokenInvalid) {
    await db.calendarSyncState.update({
      where: { id: state.id },
      data: { syncToken: null, lastError: "syncToken invalid; full resync next" },
    });
    return { upserted: 0, deleted: 0, fullSync: false, syncTokenInvalid: true };
  }

  // Welke items horen bij deze calendar? Bepaalt of we per-item of org-wide
  // blokken. Org-default-calendar ophalen voor de fallback-check.
  const orgIntegration = await db.orgIntegration.findUnique({
    where: {
      organizationId_integrationKey: {
        organizationId,
        integrationKey: "google-calendar",
      },
    },
    select: { config: true },
  });
  const orgCfg = (orgIntegration?.config as Record<string, unknown> | null) ?? {};
  const orgDefaultCalendarId =
    typeof orgCfg.calendarId === "string" ? orgCfg.calendarId : null;
  const itemIds = await itemsForCalendar(
    organizationId,
    calendarId,
    orgDefaultCalendarId,
  );
  const itemIdForBlock = pickItemIdForBlock(itemIds);

  let upserted = 0;
  let deleted = 0;

  for (const event of result.events) {
    if (!event.id) continue;

    // Onze eigen events skippen — die staan al als Booking in de DB.
    if (isOwnBookingEvent(event)) continue;

    if (isCancelledEvent(event)) {
      const res = await db.calendarBlock.deleteMany({
        where: { organizationId, source: "google-calendar", externalId: event.id },
      });
      deleted += res.count;
      continue;
    }

    const startAt = eventStart(event);
    const endAt = eventEnd(event);
    if (!startAt || !endAt || endAt <= startAt) continue;

    await db.calendarBlock.upsert({
      where: {
        organizationId_source_externalId: {
          organizationId,
          source: "google-calendar",
          externalId: event.id,
        },
      },
      create: {
        organizationId,
        itemId: itemIdForBlock,
        source: "google-calendar",
        externalId: event.id,
        calendarId,
        startAt,
        endAt,
        summary: event.summary ?? null,
      },
      update: {
        // itemId kan wijzigen wanneer mapping verandert.
        itemId: itemIdForBlock,
        calendarId,
        startAt,
        endAt,
        summary: event.summary ?? null,
      },
    });
    upserted += 1;
  }

  await db.calendarSyncState.update({
    where: { id: state.id },
    data: {
      syncToken: result.nextSyncToken ?? state.syncToken,
      lastPolledAt: new Date(),
      lastError: null,
      failureCount: 0,
    },
  });

  return {
    upserted,
    deleted,
    fullSync: !state.syncToken,
    syncTokenInvalid: false,
  };
}

/**
 * Registreert (of vernieuwt) een Google push channel voor de gegeven
 * calendar en doet meteen één sync zodat de DB up-to-date is.
 */
export async function ensureWatchAndInitialSync(
  organizationId: string,
  calendarId: string,
): Promise<void> {
  const state = await db.calendarSyncState.findUnique({
    where: {
      organizationId_integrationKey_calendarId: {
        organizationId,
        integrationKey: "google-calendar",
        calendarId,
      },
    },
  });

  const now = Date.now();
  const channelHealthy =
    state?.channelId &&
    state.channelExpiresAt &&
    state.channelExpiresAt.getTime() - RENEWAL_MARGIN_MS > now;

  if (!channelHealthy) {
    // Eerst de oude channel afsluiten (best-effort).
    if (state?.channelId && state.resourceId) {
      await stopWatchChannel({
        organizationId,
        channelId: state.channelId,
        resourceId: state.resourceId,
      }).catch(() => {});
    }

    const channelId = `bb-${randomBytes(12).toString("hex")}`;
    // Geheim channel-token: Google echoot dit terug in X-Goog-Channel-Token
    // bij elke push, zodat een uitgelekte channelId niet volstaat om
    // nep-pushes te sturen.
    const webhookToken = randomBytes(24).toString("hex");
    const webhookUrl = `${env.APP_URL}/api/integrations/google-calendar/webhook`;
    try {
      const channel = await watchCalendar({
        organizationId,
        calendarId,
        channelId,
        webhookUrl,
        token: webhookToken,
      });
      await db.calendarSyncState.upsert({
        where: {
          organizationId_integrationKey_calendarId: {
            organizationId,
            integrationKey: "google-calendar",
            calendarId,
          },
        },
        create: {
          organizationId,
          integrationKey: "google-calendar",
          calendarId,
          channelId: channel.id,
          resourceId: channel.resourceId,
          channelExpiresAt: new Date(channel.expiration),
          webhookToken,
        },
        update: {
          channelId: channel.id,
          resourceId: channel.resourceId,
          channelExpiresAt: new Date(channel.expiration),
          webhookToken,
          lastError: null,
          failureCount: 0,
        },
      });
    } catch (err) {
      // Google laat geen webhooks naar localhost/lvh.me toe; we slaan
      // dat stilletjes over en draaien zonder push (alleen cron-poll).
      console.warn(
        `[calendar-sync] watch faalde voor ${calendarId} — val terug op poll-only:`,
        err instanceof Error ? err.message : err,
      );
      await db.calendarSyncState.upsert({
        where: {
          organizationId_integrationKey_calendarId: {
            organizationId,
            integrationKey: "google-calendar",
            calendarId,
          },
        },
        create: {
          organizationId,
          integrationKey: "google-calendar",
          calendarId,
          lastError: err instanceof Error ? err.message.slice(0, 500) : "watch failed",
        },
        update: {
          lastError: err instanceof Error ? err.message.slice(0, 500) : "watch failed",
        },
      });
    }
  }

  await syncCalendarFromGoogle(organizationId, calendarId).catch((err) => {
    console.warn(
      `[calendar-sync] initial sync faalde voor ${calendarId}:`,
      err instanceof Error ? err.message : err,
    );
  });
}

/**
 * Stopt het watch-channel voor deze calendar zonder de syncState/blocks
 * te wissen — handig bij wisselen van default agenda (dan willen we de
 * historische blocks behouden zolang de mapping geldig was, maar geen
 * nieuwe pushes meer ontvangen).
 */
export async function stopWatchForCalendar(
  organizationId: string,
  calendarId: string,
): Promise<void> {
  const state = await db.calendarSyncState.findUnique({
    where: {
      organizationId_integrationKey_calendarId: {
        organizationId,
        integrationKey: "google-calendar",
        calendarId,
      },
    },
  });
  if (!state?.channelId || !state.resourceId) return;

  // Stop alleen als deze calendar nergens anders nog gebruikt wordt.
  // (Org-default OF per-item.)
  const orgIntegration = await db.orgIntegration.findUnique({
    where: {
      organizationId_integrationKey: {
        organizationId,
        integrationKey: "google-calendar",
      },
    },
    select: { config: true },
  });
  const cfg = (orgIntegration?.config as Record<string, unknown> | null) ?? {};
  if (cfg.calendarId === calendarId) return;

  const itemsUsing = await db.item.count({
    where: {
      organizationId,
      integrationConfig: {
        path: ["googleCalendar", "calendarId"],
        equals: calendarId,
      },
    },
  });
  if (itemsUsing > 0) return;

  await stopWatchChannel({
    organizationId,
    channelId: state.channelId,
    resourceId: state.resourceId,
  });

  await db.calendarSyncState.update({
    where: { id: state.id },
    data: { channelId: null, resourceId: null, channelExpiresAt: null },
  });
}

/**
 * Cron-helper: renew alle watch-channels die <2 dagen geldigheid hebben en
 * doe een vangnet-sync voor states die al >1u niet meer gepolld zijn.
 * Returned een sumstats-object voor logging.
 */
export async function refreshExpiringChannels(): Promise<{
  renewed: number;
  synced: number;
  failed: number;
}> {
  let renewed = 0;
  let synced = 0;
  let failed = 0;

  // Channels die binnen 2 dagen verlopen of al verlopen zijn.
  const expiringSoon = new Date(Date.now() + RENEWAL_MARGIN_MS);
  const states = await db.calendarSyncState.findMany({
    where: {
      OR: [
        { channelExpiresAt: { lt: expiringSoon } },
        { channelExpiresAt: null },
      ],
      failureCount: { lt: MAX_FAILURE_COUNT },
    },
  });

  for (const state of states) {
    // Skip states die niet bij een ACTIVE OrgIntegration horen.
    const integration = await db.orgIntegration.findUnique({
      where: {
        organizationId_integrationKey: {
          organizationId: state.organizationId,
          integrationKey: state.integrationKey,
        },
      },
      select: { status: true },
    });
    if (integration?.status !== "ACTIVE") continue;

    try {
      await ensureWatchAndInitialSync(state.organizationId, state.calendarId);
      renewed += 1;
      synced += 1;
    } catch (err) {
      failed += 1;
      await db.calendarSyncState.update({
        where: { id: state.id },
        data: {
          lastError: err instanceof Error ? err.message.slice(0, 500) : "renew failed",
          failureCount: { increment: 1 },
        },
      });
    }
  }

  return { renewed, synced, failed };
}

/** Vind alle (org, calendarId) paren die het Google-watch channel met deze ID hebben (voor webhook-routing). */
export async function findSyncStateByChannelId(channelId: string) {
  return db.calendarSyncState.findUnique({ where: { channelId } });
}

export const CHANNEL_LIFETIME = CHANNEL_LIFETIME_MS;
