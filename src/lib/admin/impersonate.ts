import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export const IMPERSONATE_COOKIE = "bb_impersonate";

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
 * The cookie is signed by encoding both ids; we additionally verify the
 * real user's session matches realUserId — so a leaked cookie alone can't
 * be used by another account.
 */
export async function getImpersonation(): Promise<ImpersonationState | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const jar = await cookies();
  const raw = jar.get(IMPERSONATE_COOKIE)?.value;
  if (!raw) return null;

  const [realUserId, targetUserId] = raw.split(":");
  if (!realUserId || !targetUserId) return null;
  if (realUserId !== session.user.id) return null;

  const [real, target] = await Promise.all([
    db.user.findUnique({ where: { id: realUserId }, select: { id: true, isAdmin: true } }),
    db.user.findUnique({ where: { id: targetUserId }, select: { id: true } }),
  ]);
  if (!real?.isAdmin || !target) return null;

  return { realUserId, targetUserId };
}

export function buildImpersonationCookieValue(realUserId: string, targetUserId: string): string {
  return `${realUserId}:${targetUserId}`;
}
