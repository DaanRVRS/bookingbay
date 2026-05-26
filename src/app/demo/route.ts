import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { createDemoTenant } from "@/lib/demo/seed";
import { signDemoToken } from "@/lib/demo/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Demo-entry. Bewust een Route Handler i.p.v. een page.tsx omdat
 * Next.js 15+ NIET toestaat dat Server Components cookies setten — dat
 * mag alleen vanuit Route Handlers, Server Actions of Middleware. Een
 * server-page die `cookies().set()` doet gooit een 500.
 *
 * Flow:
 *  1. cookie `bb_demo_uid` check — hervatten of nieuwe tenant maken
 *  2. signt korte-TTL handoff-token
 *  3. redirect naar /demo/auth?token=… (die page rendert client-side
 *     signIn voor de daadwerkelijke NextAuth-sessie + redirect naar
 *     /dashboard)
 */
const COOKIE = "bb_demo_uid";
const COOKIE_TTL_DAYS = 30;

export async function GET() {
  const cookieStore = await cookies();
  const existingId = cookieStore.get(COOKIE)?.value ?? null;

  let userId: string | null = null;

  if (existingId) {
    // Hervat — alleen accepteren als user nog bestaat én demo is.
    const existing = await db.user.findUnique({
      where: { id: existingId },
      select: { id: true, isDemo: true },
    });
    if (existing && existing.isDemo) {
      userId = existing.id;
    }
  }

  if (!userId) {
    const created = await createDemoTenant();
    userId = created.userId;
    cookieStore.set(COOKIE, userId, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/",
      maxAge: COOKIE_TTL_DAYS * 24 * 60 * 60,
    });
  }

  const token = signDemoToken(userId);
  const baseUrl = env.APP_URL.replace(/\/$/, "");
  return NextResponse.redirect(
    `${baseUrl}/demo/auth?token=${encodeURIComponent(token)}`,
  );
}
