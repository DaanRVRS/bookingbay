import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { ensureDemoUserId } from "@/lib/demo/seed";
import { signDemoToken } from "@/lib/demo/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Demo-entry. Eén vaste, gedeelde demo-tenant (read-only) — geen
 * per-bezoeker accounts meer. Iedere bezoeker logt in op dezelfde
 * demo-gebruiker; schrijfacties worden door de demo-guard geblokkeerd,
 * dus niemand kan elkaars beeld vervuilen.
 *
 * Route Handler i.p.v. page: cookies/redirect-zekerheid + we hebben hier
 * geen cookie nodig (de demo-user is altijd dezelfde).
 */
export async function GET() {
  const userId = await ensureDemoUserId();
  const token = signDemoToken(userId);
  const baseUrl = env.APP_URL.replace(/\/$/, "");
  return NextResponse.redirect(
    `${baseUrl}/demo/auth?token=${encodeURIComponent(token)}`,
  );
}
