import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit/log";
import { getCurrentUser } from "@/lib/auth/session";
import {
  exchangeCodeForTokens,
  type GoogleCalendarConfig,
} from "@/lib/integrations/google-calendar";
import { sealConfig } from "@/lib/integrations/crypto";

export const dynamic = "force-dynamic";

const DASHBOARD_DETAIL = "/dashboard/integrations/google-calendar";

function redirectWithError(message: string) {
  const url = new URL(DASHBOARD_DETAIL, env.APP_URL);
  url.searchParams.set("oauth_error", message);
  return NextResponse.redirect(url);
}

function redirectSuccess() {
  const url = new URL(DASHBOARD_DETAIL, env.APP_URL);
  url.searchParams.set("oauth_success", "1");
  return NextResponse.redirect(url);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const googleError = url.searchParams.get("error");

  if (googleError) {
    return redirectWithError(`Google annuleerde: ${googleError}`);
  }
  if (!code || !stateParam) {
    return redirectWithError("Geen code/state ontvangen van Google");
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("bb_gc_oauth_state")?.value;
  const orgId = cookieStore.get("bb_gc_oauth_org")?.value;
  // Cleanup van state-cookies — ongeacht slagen of falen.
  cookieStore.delete("bb_gc_oauth_state");
  cookieStore.delete("bb_gc_oauth_org");

  if (!storedState || !orgId || storedState !== stateParam) {
    return redirectWithError("State-mismatch — opnieuw proberen");
  }

  // Verifieer dat de huidige gebruiker (a) ingelogd is en (b) lid is van
  // deze org. Anders zou een gepiqte callback-URL andermans calendar kunnen
  // koppelen.
  const user = await getCurrentUser();
  if (!user) return redirectWithError("Niet ingelogd");
  const membership = await db.membership.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: orgId } },
    select: { id: true, role: true },
  });
  if (!membership) return redirectWithError("Geen toegang tot deze organisatie");
  if (membership.role === "VIEWER") {
    return redirectWithError("VIEWER-rol mag geen koppelingen activeren");
  }

  const redirectUri = `${env.APP_URL}/api/integrations/google-calendar/callback`;

  let tokens;
  let accountEmail: string | null = null;
  try {
    const result = await exchangeCodeForTokens({ code, redirectUri });
    tokens = result.tokens;
    accountEmail = result.accountEmail;
  } catch (err) {
    return redirectWithError(
      err instanceof Error ? err.message.slice(0, 200) : "Token-exchange faalde",
    );
  }

  if (!tokens.refresh_token) {
    // Zonder refresh-token kunnen we 't access-token niet vernieuwen na 1u.
    // Dit gebeurt soms bij her-activatie zonder revoke; we zetten 'prompt=consent'
    // dus dat zou niet moeten kunnen, maar voor de zekerheid:
    return redirectWithError(
      "Google leverde geen refresh-token — verbreek de koppeling in je Google-account en probeer opnieuw",
    );
  }

  const cfg: GoogleCalendarConfig = {
    _encAccessToken: tokens.access_token,
    _encRefreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    accountEmail: accountEmail ?? undefined,
    calendarId: "primary",
    scopes: tokens.scope.split(" "),
  };

  const sealed = sealConfig(cfg as Record<string, unknown>) as Record<string, never>;

  // Upsert: REQUESTED of nieuw → ACTIVE.
  const existing = await db.orgIntegration.findUnique({
    where: {
      organizationId_integrationKey: {
        organizationId: orgId,
        integrationKey: "google-calendar",
      },
    },
  });

  const now = new Date();
  if (existing) {
    await db.orgIntegration.update({
      where: { id: existing.id },
      data: {
        status: "ACTIVE",
        activatedAt: existing.activatedAt ?? now,
        pausedAt: null,
        failureReason: null,
        config: sealed,
      },
    });
  } else {
    await db.orgIntegration.create({
      data: {
        organizationId: orgId,
        integrationKey: "google-calendar",
        status: "ACTIVE",
        monthlyPriceEuro: 0,
        activatedAt: now,
        config: sealed,
      },
    });
  }

  await audit({
    organizationId: orgId,
    actorUserId: user.id,
    action: "integration.google-calendar.connected",
    resource: "integration",
    resourceId: "google-calendar",
    metadata: { accountEmail },
  });

  // Pre-fetch de calendar-list zodat de dropdown direct gevuld is.
  try {
    const { listCalendars } = await import("@/lib/integrations/google-calendar");
    const calendars = await listCalendars(orgId);
    // Pak primair als initial default als de klant er nog geen gekozen had.
    const fallbackCalendarId =
      calendars.find((c) => c.primary)?.id ?? cfg.calendarId ?? "primary";
    const stored = await db.orgIntegration.findUnique({
      where: {
        organizationId_integrationKey: {
          organizationId: orgId,
          integrationKey: "google-calendar",
        },
      },
      select: { id: true, config: true },
    });
    if (stored) {
      const baseCfg = (stored.config as Record<string, unknown>) ?? {};
      const merged = {
        ...baseCfg,
        calendarId: fallbackCalendarId,
        calendars,
        calendarsCachedAt: Date.now(),
      };
      await db.orgIntegration.update({
        where: { id: stored.id },
        data: { config: merged as never },
      });
    }
  } catch (err) {
    console.warn(
      `[google-calendar/callback] calendarList ophalen mislukt voor org ${orgId}:`,
      err instanceof Error ? err.message : err,
    );
  }

  // Direct bij activatie: registreer push-channel + backfill events. Doen
  // we best-effort omdat een mislukking hier de OAuth-flow niet mag breken
  // (cron pakt 'm later wel op).
  try {
    const fresh = await db.orgIntegration.findUnique({
      where: {
        organizationId_integrationKey: {
          organizationId: orgId,
          integrationKey: "google-calendar",
        },
      },
      select: { config: true },
    });
    const freshCfg = (fresh?.config as Record<string, unknown> | null) ?? {};
    const calendarId =
      (typeof freshCfg.calendarId === "string" ? freshCfg.calendarId : null) ||
      cfg.calendarId ||
      "primary";
    const { ensureWatchAndInitialSync } = await import(
      "@/lib/integrations/calendar-sync"
    );
    await ensureWatchAndInitialSync(orgId, calendarId);
  } catch (err) {
    console.warn(
      `[google-calendar/callback] initial watch/sync mislukt voor org ${orgId}:`,
      err instanceof Error ? err.message : err,
    );
  }

  return redirectSuccess();
}
