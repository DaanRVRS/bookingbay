import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { sealConfig, unsealConfig } from "./crypto";

/**
 * Google Calendar OAuth + Calendar API client. Geen externe lib — we praten
 * direct tegen Google's REST endpoints zodat we geen 30MB googleapis-bundle
 * meeslepen voor één koppeling.
 *
 * Tokens leven in `OrgIntegration.config` onder `_encAccessToken` en
 * `_encRefreshToken` (versleuteld via lib/integrations/crypto). De rest
 * (account-email, calendarId, expiry) staat plaintext zodat we 'm zonder
 * decrypt in admin-views kunnen tonen.
 */

const GC_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GC_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GC_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const GC_API = "https://www.googleapis.com/calendar/v3";

/**
 * Minimal scopes — alleen events lezen/schrijven op de geselecteerde
 * agenda. We vragen *niet* om `calendar` (alles), dat scheelt scary-warnings
 * op de consent-screen.
 */
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "openid",
  "email",
];

export interface CalendarListEntry {
  id: string;
  summary: string;
  primary: boolean;
  /** Of de gebruiker rechten heeft om events aan te maken (writer/owner). */
  canWrite: boolean;
}

export interface GoogleCalendarConfig {
  _encAccessToken?: string;
  _encRefreshToken?: string;
  /** Unix ms. We refreshen 60s voor expiry. */
  expiresAt?: number;
  /** E-mail van het Google-account waar 'mee verbonden' is. */
  accountEmail?: string;
  /** Org-wide default calendar-id (fallback wanneer een item geen override heeft). */
  calendarId?: string;
  /** Scopes die de klant heeft geapproved — handig voor diagnostics. */
  scopes?: string[];
  /** Gecachete calendar-list (refresht bij elke open van de detail-pagina). */
  calendars?: CalendarListEntry[];
  /** Wanneer we de calendarList voor 't laatst opvraagden. */
  calendarsCachedAt?: number;
}

export function isGoogleConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

export function buildAuthorizeUrl(opts: {
  state: string;
  redirectUri: string;
  loginHint?: string;
}): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    // 'consent' garandeert dat we een refresh-token krijgen, óók bij een
    // tweede activatie van dezelfde gebruiker (anders levert Google soms
    // alleen access-token).
    prompt: "consent",
    include_granted_scopes: "true",
    state: opts.state,
    ...(opts.loginHint ? { login_hint: opts.loginHint } : {}),
  });
  return `${GC_AUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
}

export async function exchangeCodeForTokens(opts: {
  code: string;
  redirectUri: string;
}): Promise<{ tokens: TokenResponse; accountEmail: string | null }> {
  const res = await fetch(GC_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: opts.code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: opts.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google token-exchange faalde (${res.status}): ${body}`);
  }
  const tokens = (await res.json()) as TokenResponse;
  const accountEmail = extractEmailFromIdToken(tokens.id_token);
  return { tokens, accountEmail };
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch(GC_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google token-refresh faalde (${res.status}): ${body}`);
  }
  return (await res.json()) as TokenResponse;
}

/**
 * Haalt een valid access-token op voor de gegeven org. Refresht
 * automatisch als 'm bijna verlopen is. Bewaart het nieuwe token weer
 * in de DB. Gooit als de koppeling niet (meer) actief is.
 */
export async function getValidAccessToken(organizationId: string): Promise<{
  accessToken: string;
  config: GoogleCalendarConfig;
  rowId: string;
}> {
  const row = await db.orgIntegration.findUnique({
    where: {
      organizationId_integrationKey: {
        organizationId,
        integrationKey: "google-calendar",
      },
    },
  });
  if (!row) throw new Error("Google Calendar niet gekoppeld");
  if (row.status !== "ACTIVE") {
    throw new Error(`Google Calendar koppeling is ${row.status}, niet ACTIVE`);
  }

  const cfg = unsealConfig(row.config as Record<string, unknown>) as GoogleCalendarConfig;
  if (!cfg._encAccessToken && !cfg._encRefreshToken) {
    throw new Error("Geen tokens opgeslagen");
  }

  const now = Date.now();
  const skewMs = 60_000;
  if (cfg._encAccessToken && cfg.expiresAt && cfg.expiresAt - skewMs > now) {
    return { accessToken: cfg._encAccessToken, config: cfg, rowId: row.id };
  }

  // Verlopen of geen access-token → refresh.
  if (!cfg._encRefreshToken) {
    // Geen refresh — markeer FAILED zodat klant opnieuw moet koppelen.
    await db.orgIntegration.update({
      where: { id: row.id },
      data: { status: "FAILED", failureReason: "Token verlopen, geen refresh-token" },
    });
    throw new Error("Geen refresh-token aanwezig — herverbind via dashboard");
  }

  try {
    const fresh = await refreshAccessToken(cfg._encRefreshToken);
    const newCfg: GoogleCalendarConfig = {
      ...cfg,
      _encAccessToken: fresh.access_token,
      _encRefreshToken: fresh.refresh_token ?? cfg._encRefreshToken,
      expiresAt: now + fresh.expires_in * 1000,
      scopes: fresh.scope.split(" "),
    };
    await db.orgIntegration.update({
      where: { id: row.id },
      data: {
        config: sealConfig(newCfg as Record<string, unknown>) as Record<string, never>,
      },
    });
    return { accessToken: fresh.access_token, config: newCfg, rowId: row.id };
  } catch (err) {
    await db.orgIntegration.update({
      where: { id: row.id },
      data: {
        status: "FAILED",
        failureReason: err instanceof Error ? err.message.slice(0, 500) : "Refresh failed",
      },
    });
    throw err;
  }
}

export async function revokeToken(token: string): Promise<void> {
  await fetch(`${GC_REVOKE_URL}?token=${encodeURIComponent(token)}`, {
    method: "POST",
  }).catch(() => {
    // Best-effort — als het al verlopen is geeft Google een 400. Niet boeiend.
  });
}

// ── Calendar API wrappers ──────────────────────────────────────────────

interface GoogleEvent {
  id?: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: { email: string; displayName?: string }[];
  status?: string;
  extendedProperties?: {
    private?: Record<string, string>;
    shared?: Record<string, string>;
  };
}

interface UpsertEventArgs {
  organizationId: string;
  bookingId: string;
  summary: string;
  description: string;
  startAt: Date;
  endAt: Date;
  attendeeEmail?: string;
  attendeeName?: string;
  /** Bestaand Google event-id (bij updates). */
  existingEventId?: string | null;
  /** Override van de standaard org-default calendar. Komt uit Item.integrationConfig. */
  calendarIdOverride?: string | null;
}

/**
 * Maakt of update een event in de gekoppelde Google Calendar. Returnt het
 * event-id zodat we 'm op `booking` kunnen opslaan voor toekomstige updates.
 */
export async function upsertBookingEvent(
  args: UpsertEventArgs,
): Promise<{ eventId: string | null; calendarId: string }> {
  const { accessToken, config } = await getValidAccessToken(args.organizationId);
  const calendarId =
    args.calendarIdOverride || config.calendarId || "primary";

  const body: GoogleEvent = {
    summary: args.summary,
    description: args.description,
    start: { dateTime: args.startAt.toISOString() },
    end: { dateTime: args.endAt.toISOString() },
    ...(args.attendeeEmail
      ? {
          attendees: [
            {
              email: args.attendeeEmail,
              ...(args.attendeeName ? { displayName: args.attendeeName } : {}),
            },
          ],
        }
      : {}),
    extendedProperties: {
      private: {
        bookingbayBookingId: args.bookingId,
      },
    },
  };

  const url = args.existingEventId
    ? `${GC_API}/calendars/${encodeURIComponent(calendarId)}/events/${args.existingEventId}`
    : `${GC_API}/calendars/${encodeURIComponent(calendarId)}/events`;

  const res = await fetch(url, {
    method: args.existingEventId ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // 404 op een PATCH = event handmatig verwijderd in Google; recreate.
    if (res.status === 404 && args.existingEventId) {
      return upsertBookingEvent({ ...args, existingEventId: null });
    }
    const text = await res.text().catch(() => "");
    throw new Error(`Google API ${res.status}: ${text.slice(0, 400)}`);
  }

  const event = (await res.json()) as GoogleEvent;
  await markSynced(args.organizationId);
  return { eventId: event.id ?? null, calendarId };
}

export async function deleteBookingEvent(
  organizationId: string,
  eventId: string,
  calendarIdOverride?: string | null,
): Promise<void> {
  const { accessToken, config } = await getValidAccessToken(organizationId);
  const calendarId = calendarIdOverride || config.calendarId || "primary";
  const res = await fetch(
    `${GC_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  // 410/404 betekent al weg — prima.
  if (!res.ok && res.status !== 410 && res.status !== 404) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google API delete ${res.status}: ${text.slice(0, 400)}`);
  }
  await markSynced(organizationId);
}

async function markSynced(organizationId: string): Promise<void> {
  await db.orgIntegration.update({
    where: {
      organizationId_integrationKey: {
        organizationId,
        integrationKey: "google-calendar",
      },
    },
    data: { lastSyncAt: new Date() },
  });
}

/**
 * Best-effort wrapper rond een sync-call: vangt elke fout op, logged ze, en
 * markeert de koppeling als FAILED zodat de klant 'm opnieuw kan verbinden.
 * Wordt gebruikt vanuit booking server-actions zodat een Google API-storing
 * nooit een normale boeking blokkeert.
 */
export async function safeSync<T>(
  organizationId: string,
  fn: () => Promise<T>,
): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    console.warn(
      `[google-calendar] sync mislukt voor org ${organizationId}:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

// ── Calendar-list ──────────────────────────────────────────────────────

/**
 * Haalt de lijst agenda's op waar deze gebruiker toegang toe heeft.
 * Filtert direct uit op alleen schrijfbare agenda's (writer/owner).
 */
export async function listCalendars(
  organizationId: string,
): Promise<CalendarListEntry[]> {
  const { accessToken } = await getValidAccessToken(organizationId);
  const res = await fetch(
    `${GC_API}/users/me/calendarList?minAccessRole=writer&maxResults=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google calendarList ${res.status}: ${text.slice(0, 400)}`);
  }
  const data = (await res.json()) as {
    items?: Array<{
      id: string;
      summary?: string;
      summaryOverride?: string;
      primary?: boolean;
      accessRole?: string;
    }>;
  };
  return (data.items ?? []).map((c) => ({
    id: c.id,
    summary: c.summaryOverride || c.summary || c.id,
    primary: c.primary ?? false,
    canWrite: c.accessRole === "writer" || c.accessRole === "owner",
  }));
}

// ── Bidirectionele sync — events.list + watch ──────────────────────────

interface GoogleListEventsResponse {
  items?: GoogleEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

/**
 * Haalt events op voor incrementele sync. Bij syncToken=null doet 'ie een
 * volledige backfill van een venster (default 30 dagen terug, 180 dagen vooruit).
 * Bij 410 Gone (token verlopen >7 dagen) gooien we zodat de caller een
 * full-sync triggert.
 */
export async function listEventsForSync(args: {
  organizationId: string;
  calendarId: string;
  syncToken?: string | null;
}): Promise<{
  events: GoogleEvent[];
  nextSyncToken: string | null;
  syncTokenInvalid: boolean;
}> {
  const { accessToken } = await getValidAccessToken(args.organizationId);
  const events: GoogleEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | null = null;

  do {
    const params = new URLSearchParams({
      showDeleted: "true",
      singleEvents: "true",
      maxResults: "250",
    });
    if (args.syncToken) {
      params.set("syncToken", args.syncToken);
    } else {
      // Full backfill venster.
      const now = new Date();
      const min = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const max = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
      params.set("timeMin", min.toISOString());
      params.set("timeMax", max.toISOString());
    }
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(
      `${GC_API}/calendars/${encodeURIComponent(args.calendarId)}/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (res.status === 410) {
      // syncToken te oud — caller moet een full-sync doen.
      return { events: [], nextSyncToken: null, syncTokenInvalid: true };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Google events.list ${res.status}: ${text.slice(0, 400)}`);
    }
    const data = (await res.json()) as GoogleListEventsResponse;
    if (data.items) events.push(...data.items);
    pageToken = data.nextPageToken;
    if (data.nextSyncToken) nextSyncToken = data.nextSyncToken;
  } while (pageToken);

  return { events, nextSyncToken, syncTokenInvalid: false };
}

interface WatchChannel {
  id: string;
  resourceId: string;
  expiration: number;
}

/**
 * Registreert een Google Calendar push notification channel. Google
 * stuurt POSTs naar `address` zodra een event op de geselecteerde
 * calendar wijzigt. Channels verlopen na max 7 dagen — cron renewt.
 */
export async function watchCalendar(args: {
  organizationId: string;
  calendarId: string;
  channelId: string;
  webhookUrl: string;
  /** Optionele HMAC-style token die Google bij elke push meestuurt. */
  token?: string;
}): Promise<WatchChannel> {
  const { accessToken } = await getValidAccessToken(args.organizationId);
  const res = await fetch(
    `${GC_API}/calendars/${encodeURIComponent(args.calendarId)}/events/watch`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: args.channelId,
        type: "web_hook",
        address: args.webhookUrl,
        ...(args.token ? { token: args.token } : {}),
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google watch ${res.status}: ${text.slice(0, 400)}`);
  }
  const data = (await res.json()) as {
    id: string;
    resourceId: string;
    expiration: string;
  };
  return {
    id: data.id,
    resourceId: data.resourceId,
    expiration: Number(data.expiration),
  };
}

/** Stop een push-channel zodat Google geen pushes meer stuurt. */
export async function stopWatchChannel(args: {
  organizationId: string;
  channelId: string;
  resourceId: string;
}): Promise<void> {
  const { accessToken } = await getValidAccessToken(args.organizationId);
  await fetch(`${GC_API}/channels/stop`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: args.channelId, resourceId: args.resourceId }),
  }).catch(() => {
    // Best-effort; als 't channel al verlopen is geeft Google een 404.
  });
}

/**
 * Heeft dit event een BookingBay-link in extendedProperties? Dat betekent
 * dat het door ons gemaakt is — niet terug-syncen als externe blok.
 */
export function isOwnBookingEvent(event: GoogleEvent): boolean {
  return Boolean(event.extendedProperties?.private?.bookingbayBookingId);
}

/** Returnt true als event als cancelled is gemarkeerd in Google. */
export function isCancelledEvent(event: GoogleEvent): boolean {
  return event.status === "cancelled";
}

/** Decodeert het `email` claim uit een Google id_token zonder verificatie.
 *  Niet voor security — alleen voor display ("verbonden als x@y.com"). */
function extractEmailFromIdToken(idToken: string | undefined): string | null {
  if (!idToken) return null;
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;
  try {
    const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payloadB64 + "=".repeat((4 - (payloadB64.length % 4)) % 4);
    const json = JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as {
      email?: string;
    };
    return json.email ?? null;
  } catch {
    return null;
  }
}
