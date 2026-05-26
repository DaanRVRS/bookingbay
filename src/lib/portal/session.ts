import "server-only";
import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * Klant-portaal session — geen NextAuth, gewoon een signed cookie per
 * (orgId, customerEmail). Klanten zijn geen User-rows; ze authenticeren
 * met een magic-link op /portal/[slug]/login, en de verify-stap zet
 * deze cookie zodat ze hun eigen boekingen kunnen bekijken.
 *
 * Cookie-naam is per org zodat een klant op meerdere tenants tegelijk
 * kan inloggen zonder dat sessies elkaar omverwerpen.
 */

const COOKIE_PREFIX = "bb_portal_";
const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 min
const SESSION_TTL_DAYS = 30;

export type PortalSession = {
  organizationId: string;
  email: string;
};

function cookieName(orgId: string) {
  return `${COOKIE_PREFIX}${orgId}`;
}

function secret() {
  return env.NEXTAUTH_SECRET;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function verify(payload: string, signature: string): boolean {
  try {
    const expected = sign(payload);
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Maakt een magic-link token aan in de DB. Caller is verantwoordelijk
 * voor het versturen van de mail met de bijbehorende URL.
 */
export async function createPortalToken(
  organizationId: string,
  emailRaw: string,
): Promise<{ token: string; expiresAt: Date }> {
  const email = emailRaw.trim().toLowerCase();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await db.customerPortalToken.create({
    data: { organizationId, email, token, expiresAt },
  });
  return { token, expiresAt };
}

/**
 * Wisselt een geldige magic-link token in voor een portal-session cookie.
 * Token moet bestaan, niet verlopen, en nog niet gebruikt zijn.
 */
export async function consumePortalToken(
  organizationId: string,
  token: string,
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const row = await db.customerPortalToken.findUnique({
    where: { token },
    select: {
      id: true,
      organizationId: true,
      email: true,
      expiresAt: true,
      usedAt: true,
    },
  });
  if (!row || row.organizationId !== organizationId) {
    return { ok: false, error: "Link onbekend" };
  }
  if (row.usedAt) return { ok: false, error: "Link is al gebruikt" };
  if (row.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "Link is verlopen — vraag een nieuwe aan" };
  }
  await db.customerPortalToken.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });
  return { ok: true, email: row.email };
}

export async function setPortalSession(session: PortalSession): Promise<void> {
  const payload = JSON.stringify({
    o: session.organizationId,
    e: session.email,
    iat: Math.floor(Date.now() / 1000),
  });
  const b64 = Buffer.from(payload).toString("base64url");
  const sig = sign(b64);
  const cookieStore = await cookies();
  cookieStore.set(cookieName(session.organizationId), `${b64}.${sig}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function getPortalSession(
  organizationId: string,
): Promise<PortalSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(cookieName(organizationId))?.value;
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 0) return null;
  const b64 = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!verify(b64, sig)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));
    if (decoded.o !== organizationId || typeof decoded.e !== "string") return null;
    return { organizationId: decoded.o, email: decoded.e };
  } catch {
    return null;
  }
}

export async function clearPortalSession(organizationId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName(organizationId));
}
