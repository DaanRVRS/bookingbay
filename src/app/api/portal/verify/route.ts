import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import {
  consumePortalToken,
  setPortalSession,
} from "@/lib/portal/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Magic-link landing endpoint — wordt direct vanuit de e-mail aangeroepen.
 * Verifieert de token, consumeert 'm, zet de portal-session cookie en
 * redirect naar /portal/[slug]/bookings. Bij een ongeldige / verlopen /
 * gebruikte link redirect 'ie terug naar /portal/[slug]/login met een
 * foutmelding in de query-string.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = (url.searchParams.get("slug") ?? "").trim().toLowerCase();
  const token = (url.searchParams.get("token") ?? "").trim();
  const baseUrl = env.APP_URL.replace(/\/$/, "");

  if (!slug || !token) {
    return NextResponse.redirect(`${baseUrl}/portal`);
  }

  const org = await db.organization.findUnique({
    where: { slug },
    select: { id: true, slug: true, customerPortalEnabled: true },
  });
  if (!org || !org.customerPortalEnabled) {
    return NextResponse.redirect(`${baseUrl}/portal`);
  }

  const result = await consumePortalToken(org.id, token);
  if (!result.ok) {
    const params = new URLSearchParams({ error: result.error });
    return NextResponse.redirect(
      `${baseUrl}/portal/${org.slug}/login?${params.toString()}`,
    );
  }
  await setPortalSession({ organizationId: org.id, email: result.email });
  return NextResponse.redirect(`${baseUrl}/portal/${org.slug}/bookings`);
}
