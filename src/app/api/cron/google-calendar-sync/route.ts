import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { timingSafeEqualStr } from "@/lib/security/timing-safe";
import { db } from "@/lib/db";
import {
  refreshExpiringChannels,
  syncCalendarFromGoogle,
} from "@/lib/integrations/calendar-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron-doel voor Google Calendar bidirectional sync. Doet twee dingen:
 *
 *   1. Renew watch-channels die binnen <2 dagen verlopen.
 *   2. Poll-sync alle ACTIVE calendars die >15 min geleden niet zijn
 *      gesynced (vangnet voor gemiste webhooks).
 *
 * Aanroepen vanuit een externe cron, bijv. elke 5 minuten:
 *
 *   curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
 *     https://bookingbay.nl/api/cron/google-calendar-sync
 *
 * Crontab line (elke 5 min):
 *   *\/5 * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
 *               https://bookingbay.nl/api/cron/google-calendar-sync > /dev/null
 */
export async function GET(req: Request) {
  if (!env.CRON_SECRET) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }
  const auth = req.headers.get("authorization") ?? "";
  if (!timingSafeEqualStr(auth, `Bearer ${env.CRON_SECRET}`)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Stap 1: renew + initial-sync voor verlopende channels.
    const refresh = await refreshExpiringChannels();

    // Stap 2: vangnet-poll voor alles wat >15 min geleden niet gesynced is.
    const staleThreshold = new Date(Date.now() - 15 * 60 * 1000);
    const stale = await db.calendarSyncState.findMany({
      where: {
        integrationKey: "google-calendar",
        OR: [
          { lastPolledAt: null },
          { lastPolledAt: { lt: staleThreshold } },
        ],
        failureCount: { lt: 5 },
      },
      take: 50,
    });

    let polled = 0;
    let pollFailed = 0;
    for (const state of stale) {
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
        await syncCalendarFromGoogle(state.organizationId, state.calendarId);
        polled += 1;
      } catch {
        pollFailed += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      channels: refresh,
      poll: { polled, failed: pollFailed, considered: stale.length },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
