import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  findSyncStateByChannelId,
  syncCalendarFromGoogle,
} from "@/lib/integrations/calendar-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Google Calendar push notification receiver. Google stuurt een POST hier
 * heen zodra er events in een gekoppelde calendar wijzigen. De headers
 * vertellen welk channel/resource het betreft:
 *
 *   X-Goog-Channel-Id        — onze eigen channel-id (gegenereerd bij watch)
 *   X-Goog-Resource-Id       — Google's interne id voor de resource
 *   X-Goog-Resource-State    — "sync" (eerste handshake), "exists" (wijziging)
 *   X-Goog-Channel-Expiration— RFC1123 timestamp wanneer 'ie verloopt
 *
 * Body is altijd leeg — we moeten zelf events.list aanroepen om te zien
 * wat er gewijzigd is. Response moet snel zijn (<10s) anders retried Google.
 */
export async function POST(req: Request) {
  const channelId = req.headers.get("x-goog-channel-id");
  const resourceState = req.headers.get("x-goog-resource-state");

  // "sync"-state stuurt Google direct na watch-call — bevestigt dat het
  // channel werkt. Niets te doen.
  if (resourceState === "sync") {
    return new NextResponse(null, { status: 200 });
  }

  if (!channelId) {
    return new NextResponse(null, { status: 200 });
  }

  const state = await findSyncStateByChannelId(channelId);
  if (!state) {
    // Channel onbekend — kan een verlopen of door-ons-opgeruimde watch
    // zijn. 200 returnen zodat Google 'm niet eindeloos retried.
    return new NextResponse(null, { status: 200 });
  }

  // Token-verificatie: als deze watch met een token is geregistreerd, MOET de
  // push het juiste X-Goog-Channel-Token dragen. Zo volstaat een uitgelekte
  // channelId niet om resyncs af te dwingen. Legacy watches (webhookToken
  // null) worden geverifieerd zodra ze renewen.
  if (state.webhookToken) {
    const provided = req.headers.get("x-goog-channel-token") ?? "";
    const a = Buffer.from(provided);
    const b = Buffer.from(state.webhookToken);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      console.warn(`[google-calendar/webhook] ongeldig channel-token voor ${channelId}`);
      return new NextResponse(null, { status: 403 });
    }
  }

  // Trigger sync best-effort. Fouten loggen we naar de syncState, niet
  // terug naar Google — anders retriet 'ie wat alleen tot ddos leidt.
  try {
    await syncCalendarFromGoogle(state.organizationId, state.calendarId);
  } catch (err) {
    console.warn(
      `[google-calendar/webhook] sync mislukt voor channel ${channelId}:`,
      err instanceof Error ? err.message : err,
    );
  }

  return new NextResponse(null, { status: 200 });
}

/** Sommige Google internals doen een GET-probe — niet weigeren. */
export async function GET() {
  return new NextResponse(null, { status: 200 });
}
