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

/** Publieke formulieren (boeking, lead, melding) — per IP-adres. */
export const PUBLIC_FORM_IP_LIMIT: RateLimitConfig = {
  max: 12,
  windowMs: 10 * 60_000,
  lockoutMs: 10 * 60_000,
};

/** Publieke formulieren — per opgegeven e-mailadres (strenger). */
export const PUBLIC_FORM_EMAIL_LIMIT: RateLimitConfig = {
  max: 5,
  windowMs: 10 * 60_000,
  lockoutMs: 15 * 60_000,
};

/**
 * Client-IP achter Caddy: eerste waarde van X-Forwarded-For, anders
 * X-Real-IP, anders "unknown" (dan delen alle onbekende bronnen één bucket).
 */
export function clientIpFromHeaders(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const real = headers.get("x-real-ip")?.trim();
  return real ? real.slice(0, 64) : "unknown";
}

/**
 * Telt élke aanroep (niet alleen mislukkingen) — voor publieke endpoints
 * waar een geslaagde POST net zo goed misbruikt kan worden. Boven `max`
 * binnen het venster gaat de sleutel `lockoutMs` op slot.
 */
export async function consumeRateLimit(
  key: string,
  cfg: RateLimitConfig,
): Promise<{ limited: boolean; retryAfterSec: number }> {
  const now = Date.now();
  const row = await db.loginThrottle.upsert({
    where: { key },
    create: { key, count: 0, windowStart: new Date(now) },
    update: {},
  });
  if (row.lockedUntil && row.lockedUntil.getTime() > now) {
    return {
      limited: true,
      retryAfterSec: Math.ceil((row.lockedUntil.getTime() - now) / 1000),
    };
  }
  const windowExpired = now - row.windowStart.getTime() > cfg.windowMs;
  const count = windowExpired ? 1 : row.count + 1;
  const windowStart = windowExpired ? new Date(now) : row.windowStart;
  const lockedUntil = count > cfg.max ? new Date(now + cfg.lockoutMs) : null;
  await db.loginThrottle.update({
    where: { key },
    data: { count, windowStart, lockedUntil },
  });
  if (lockedUntil) {
    return { limited: true, retryAfterSec: Math.ceil(cfg.lockoutMs / 1000) };
  }
  return { limited: false, retryAfterSec: 0 };
}

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
