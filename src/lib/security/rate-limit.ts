import "server-only";
import { db } from "@/lib/db";

/**
 * Eenvoudige DB-backed brute-force-throttle. Cluster-veilig (pm2 met meerdere
 * workers deelt dezelfde Postgres) — een in-memory teller zou dat niet zijn.
 *
 * Gebruik:
 *   const gate = await checkRateLimit(key, LOGIN_LIMIT);
 *   if (gate.limited) return tooManyAttempts(gate.retryAfterSec);
 *   ... verifieer wachtwoord/code ...
 *   if (mislukt) await recordFailure(key, LOGIN_LIMIT);
 *   else        await clearAttempts(key);
 */
export interface RateLimitConfig {
  /** Max mislukte pogingen binnen `windowMs` voordat we op slot gaan. */
  max: number;
  /** Telvenster in ms. */
  windowMs: number;
  /** Hoe lang op slot na overschrijding, in ms. */
  lockoutMs: number;
}

export const LOGIN_LIMIT: RateLimitConfig = {
  max: 8,
  windowMs: 15 * 60_000,
  lockoutMs: 15 * 60_000,
};

export const TWOFA_LIMIT: RateLimitConfig = {
  max: 6,
  windowMs: 10 * 60_000,
  lockoutMs: 10 * 60_000,
};

/** Is deze sleutel momenteel op slot? */
export async function checkRateLimit(
  key: string,
): Promise<{ limited: boolean; retryAfterSec: number }> {
  const row = await db.loginThrottle.findUnique({ where: { key } });
  if (row?.lockedUntil && row.lockedUntil.getTime() > Date.now()) {
    return {
      limited: true,
      retryAfterSec: Math.ceil((row.lockedUntil.getTime() - Date.now()) / 1000),
    };
  }
  return { limited: false, retryAfterSec: 0 };
}

/** Registreer een mislukte poging; zet op slot zodra de drempel is bereikt. */
export async function recordFailure(
  key: string,
  cfg: RateLimitConfig,
): Promise<void> {
  const now = Date.now();
  const row = await db.loginThrottle.findUnique({ where: { key } });
  if (!row) {
    await db.loginThrottle.create({
      data: { key, count: 1, windowStart: new Date(now) },
    });
    return;
  }
  // Venster verlopen (en niet actief op slot) → opnieuw beginnen te tellen.
  const windowExpired = now - row.windowStart.getTime() > cfg.windowMs;
  const count = windowExpired ? 1 : row.count + 1;
  const windowStart = windowExpired ? new Date(now) : row.windowStart;
  const lockedUntil =
    count >= cfg.max ? new Date(now + cfg.lockoutMs) : row.lockedUntil;
  await db.loginThrottle.update({
    where: { key },
    data: { count, windowStart, lockedUntil },
  });
}

/** Reset de teller na een geslaagde poging. */
export async function clearAttempts(key: string): Promise<void> {
  await db.loginThrottle.deleteMany({ where: { key } });
}

/** Nette NL-foutmelding bij te veel pogingen. */
export function tooManyAttemptsMessage(retryAfterSec: number): string {
  const min = Math.max(1, Math.ceil(retryAfterSec / 60));
  return `Te veel mislukte pogingen. Probeer het over ${min} ${min === 1 ? "minuut" : "minuten"} opnieuw.`;
}
