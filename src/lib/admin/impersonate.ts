import "server-only";
import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { timingSafeEqualStr } from "@/lib/security/timing-safe";

export const IMPERSONATE_COOKIE = "bb_impersonate";

/** HMAC over "<realUserId>:<targetUserId>" met NEXTAUTH_SECRET. */
function signImpersonation(payload: string): string {
  return createHmac("sha256", env.NEXTAUTH_SECRET).update(payload).digest("hex");
}

interface ImpersonationState {
  /** The user the request is acting as. */
  targetUserId: string;
  /** The original (real) admin user behind the impersonation. */
  realUserId: string;
}

/**
 * Read active impersonation, if any. Returns null when:
 * - the cookie is absent or malformed,
 * - the real user is no longer an admin,
 * - the target user no longer exists.
 *
 * The cookie is HMAC-signed (NEXTAUTH_SECRET) over both ids, zodat de inhoud
 * niet te vervalsen is; we verifiëren daarnaast dat de sessie van de echte
 * gebruiker matcht met realUserId — een gelekte cookie alleen is dus
 * onbruikbaar voor een ander account.
 */
export async function getImpersonation(): Promise<ImpersonationState | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const jar = await cookies();
  const raw = jar.get(IMPERSONATE_COOKIE)?.value;
  if (!raw) return null;

  const [realUserId, targetUserId, sig] = raw.split(":");
  if (!realUserId || !targetUserId || !sig) return null;
  // Verifieer de handtekening vóór we de ids vertrouwen.
  if (!timingSafeEqualStr(sig, signImpersonation(`${realUserId}:${targetUserId}`))) {
    return null;
  }
  if (realUserId !== session.user.id) return null;

  const [real, target] = await Promise.all([
    db.user.findUnique({ where: { id: realUserId }, select: { id: true, isAdmin: true } }),
    db.user.findUnique({ where: { id: targetUserId }, select: { id: true } }),
  ]);
  if (!real?.isAdmin || !target) return null;

  return { realUserId, targetUserId };
}

export function buildImpersonationCookieValue(realUserId: string, targetUserId: string): string {
  const payload = `${realUserId}:${targetUserId}`;
  return `${payload}:${signImpersonation(payload)}`;
}
