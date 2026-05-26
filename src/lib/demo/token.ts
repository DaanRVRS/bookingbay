import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Short-lived signed token om een demo-user vanuit /demo het NextAuth-flow
 * in te tillen. Zelfde pattern als twofa/core.ts handoff-tokens: HMAC met
 * NEXTAUTH_SECRET, met expiry zodat een gelekte token niet eeuwig misbruikt
 * kan worden.
 *
 * TTL is bewust kort (5 min): de token wordt direct na /demo page-render
 * door de client gebruikt om signIn() aan te roepen. Niet bedoeld om te
 * bewaren of door te sturen.
 */

const TOKEN_VERSION = "d1";

export interface DemoTokenPayload {
  userId: string;
  exp: number;
}

function sign(payload: string): string {
  return createHmac("sha256", env.NEXTAUTH_SECRET).update(payload).digest("hex");
}

export function signDemoToken(userId: string, ttlMs = 5 * 60_000): string {
  const exp = Date.now() + ttlMs;
  const payload = `${TOKEN_VERSION}.${userId}.${exp}`;
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function verifyDemoToken(token: string | undefined): DemoTokenPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [version, userId, expStr, sig] = parts;
  if (version !== TOKEN_VERSION) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  const expected = sign(`${version}.${userId}.${expStr}`);
  if (sig.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) {
    return null;
  }
  return { userId, exp };
}
