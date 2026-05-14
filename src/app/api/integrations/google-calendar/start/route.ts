import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { requireOrg } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { buildAuthorizeUrl, isGoogleConfigured } from "@/lib/integrations/google-calendar";

export const dynamic = "force-dynamic";

/**
 * Klant klikt 'Activeer' op de Google Calendar koppeling → wij genereren
 * een state-token, zetten dat als HttpOnly cookie en redirecten naar Google.
 * De callback verifieert state, exchanged de code en slaat tokens op.
 */
export async function GET() {
  if (!isGoogleConfigured()) {
    return NextResponse.json(
      { error: "Google OAuth niet geconfigureerd op deze server (GOOGLE_CLIENT_ID/SECRET ontbreekt)." },
      { status: 503 },
    );
  }
  const ctx = await requireOrg();

  const state = randomBytes(24).toString("base64url");
  const redirectUri = `${env.APP_URL}/api/integrations/google-calendar/callback`;

  const authorize = buildAuthorizeUrl({
    state,
    redirectUri,
    loginHint: ctx.user.email ?? undefined,
  });

  // State + organizationId in cookie zodat de callback weet welk org dit
  // initieerde (we accepteren namelijk niet zomaar org-ids in de query).
  const cookieStore = await cookies();
  cookieStore.set("bb_gc_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.APP_URL.startsWith("https"),
    path: "/api/integrations/google-calendar",
    maxAge: 10 * 60,
  });
  cookieStore.set("bb_gc_oauth_org", ctx.organization.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.APP_URL.startsWith("https"),
    path: "/api/integrations/google-calendar",
    maxAge: 10 * 60,
  });

  return NextResponse.redirect(authorize);
}
