import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
  "bb_active_org",
];

export const dynamic = "force-dynamic";

async function clearAndRedirect(request: Request, fallback: string) {
  const cookieStore = await cookies();
  for (const name of COOKIE_NAMES) {
    cookieStore.delete(name);
  }
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? fallback;
  return NextResponse.redirect(new URL(next, request.url));
}

export function GET(request: Request) {
  return clearAndRedirect(request, "/login");
}

export function POST(request: Request) {
  return clearAndRedirect(request, "/login");
}
