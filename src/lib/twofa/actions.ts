"use server";

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signIn } from "@/lib/auth";
import { requireUser } from "@/lib/auth/session";
import { audit } from "@/lib/audit/log";
import type { ActionResult } from "@/lib/auth/schemas";
import { blockDemoWrite } from "@/lib/demo/guard";
import {
  buildOtpauthUrl,
  buildQrDataUrl,
  findMatchingBackupCode,
  generateBackupCodes,
  generateSecret,
  hashBackupCodes,
  signHandoffToken,
  verifyHandoffToken,
  verifyTotpCode,
  type BackupCode,
} from "./core";
import {
  checkRateLimit,
  recordFailure,
  clearAttempts,
  TWOFA_LIMIT,
  tooManyAttemptsMessage,
} from "@/lib/security/rate-limit";

// Cookie-namen zijn intern — niet exporteren (Next.js "use server" files
// mogen alleen async functies exporteren, geen constants).
const TWOFA_PENDING_COOKIE = "bb_2fa_pending";
const TWOFA_SETUP_SECRET_COOKIE = "bb_2fa_setup_secret";

function cookieOpts(maxAgeMs: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure:
      process.env.NODE_ENV === "production" &&
      (process.env.NEXTAUTH_URL ?? "").startsWith("https"),
    path: "/",
    maxAge: Math.floor(maxAgeMs / 1000),
  };
}

async function setHandoffCookie(payload: { userId: string; mode: "verify" | "setup" }) {
  const token = signHandoffToken({ ...payload, ttlMs: 5 * 60_000 });
  const store = await cookies();
  store.set(TWOFA_PENDING_COOKIE, token, cookieOpts(5 * 60_000));
}

async function readHandoff(): Promise<ReturnType<typeof verifyHandoffToken>> {
  const store = await cookies();
  return verifyHandoffToken(store.get(TWOFA_PENDING_COOKIE)?.value);
}

async function clearPendingCookies() {
  const store = await cookies();
  store.delete(TWOFA_PENDING_COOKIE);
  store.delete(TWOFA_SETUP_SECRET_COOKIE);
}

/**
 * Called by loginAction after password validates. Decides whether the
 * user needs a 2FA step and sets a signed pending-cookie if so. Returns
 * what the login page should do next.
 */
export async function gateTwoFactor(user: {
  id: string;
  email: string;
  isAdmin: boolean;
  twoFactorEnabledAt: Date | null;
}): Promise<{ status: "ok" } | { status: "verify" | "setup" }> {
  if (user.twoFactorEnabledAt) {
    await setHandoffCookie({ userId: user.id, mode: "verify" });
    return { status: "verify" };
  }
  if (user.isAdmin) {
    // Forced setup before login completes.
    await setHandoffCookie({ userId: user.id, mode: "setup" });
    return { status: "setup" };
  }
  return { status: "ok" };
}

/* ---------------- Login-time 2FA verify (TOTP or backup code) ---------------- */

export async function verifyTwoFactorAction(code: string): Promise<ActionResult> {
  const payload = await readHandoff();
  if (!payload || payload.mode !== "verify") {
    return { ok: false, error: "Sessie verlopen — log opnieuw in" };
  }
  // Brute-force-throttle op TOTP/backup-raden binnen het pending-venster.
  const rlKey = `2fa:${payload.userId}`;
  const gate = await checkRateLimit(rlKey);
  if (gate.limited) {
    return { ok: false, error: tooManyAttemptsMessage(gate.retryAfterSec) };
  }

  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      twoFactorSecret: true,
      twoFactorBackupCodes: true,
    },
  });
  if (!user || !user.twoFactorSecret) {
    return { ok: false, error: "2FA niet geconfigureerd" };
  }

  const trimmed = code.trim();
  const isTotpFormat = /^[0-9]{6}$/.test(trimmed);

  if (isTotpFormat) {
    if (!verifyTotpCode(user.twoFactorSecret, trimmed)) {
      await recordFailure(rlKey, TWOFA_LIMIT);
      return { ok: false, error: "Code klopt niet" };
    }
  } else {
    const stored = (user.twoFactorBackupCodes ?? []) as unknown as BackupCode[];
    const idx = await findMatchingBackupCode(trimmed, stored);
    if (idx === -1) {
      await recordFailure(rlKey, TWOFA_LIMIT);
      return { ok: false, error: "Code klopt niet" };
    }
    const updated = stored.map((c, i) =>
      i === idx ? { ...c, usedAt: new Date().toISOString() } : c,
    );
    await db.user.update({
      where: { id: user.id },
      data: { twoFactorBackupCodes: updated as unknown as object },
    });
    await audit({
      actorUserId: user.id,
      action: "user.2fa.backup-code-used",
      resource: "user",
      resourceId: user.id,
    });
  }

  await clearAttempts(rlKey);

  // TOTP/backup geslaagd → mint nu pas een "authenticated"-token (de enige
  // modus die de 2fa-handoff-provider accepteert). Het pre-TOTP
  // "verify"-cookie kan hierdoor nooit zelf een sessie geven.
  const authToken = signHandoffToken({
    userId: user.id,
    mode: "authenticated",
    ttlMs: 60_000,
  });
  const store = await cookies();
  store.set(TWOFA_PENDING_COOKIE, authToken, cookieOpts(60_000));
  await signIn("2fa-handoff", { token: authToken, redirect: false });
  await clearPendingCookies();
  return { ok: true };
}

/* ---------------- Setup flow (forced for admin OR opt-in for klant) ---------------- */

interface SetupPayload {
  secret: string;
  otpauthUrl: string;
  qrDataUrl: string;
}

async function getSetupContext(): Promise<
  { userId: string; email: string; fromHandoff: boolean } | null
> {
  // Two ways to start setup: from the login handoff (forced for admins
  // without 2FA), or from /dashboard/settings/profile (opt-in for klanten).
  const handoff = await readHandoff();
  if (handoff && handoff.mode === "setup") {
    const u = await db.user.findUnique({
      where: { id: handoff.userId },
      select: { id: true, email: true },
    });
    if (u) return { userId: u.id, email: u.email, fromHandoff: true };
  }
  // Fallback: already-logged-in user opting in from settings.
  try {
    const u = await requireUser();
    return { userId: u.id, email: u.email, fromHandoff: false };
  } catch {
    return null;
  }
}

export async function beginSetupAction(): Promise<
  ActionResult<SetupPayload>
> {
  const ctx = await getSetupContext();
  if (!ctx) {
    return { ok: false, error: "Geen sessie of pending handoff" };
  }
  // Generate fresh secret; store it as 'pending' in the user row but don't
  // mark enabled yet. We always rotate on begin — als iemand twee tabs
  // open heeft is dat hun probleem.
  const secret = generateSecret();
  await db.user.update({
    where: { id: ctx.userId },
    data: { twoFactorSecret: secret, twoFactorEnabledAt: null },
  });
  const otpauthUrl = buildOtpauthUrl(secret, ctx.email);
  const qrDataUrl = await buildQrDataUrl(otpauthUrl);
  return { ok: true, data: { secret, otpauthUrl, qrDataUrl } };
}

export async function confirmSetupAction(
  code: string,
): Promise<ActionResult<{ backupCodes: string[] }>> {
  const ctx = await getSetupContext();
  if (!ctx) {
    return { ok: false, error: "Geen sessie of pending handoff" };
  }
  const user = await db.user.findUnique({
    where: { id: ctx.userId },
    select: { id: true, twoFactorSecret: true, isAdmin: true },
  });
  if (!user || !user.twoFactorSecret) {
    return { ok: false, error: "Geen pending secret — begin opnieuw" };
  }
  if (!verifyTotpCode(user.twoFactorSecret, code)) {
    return { ok: false, error: "Code klopt niet" };
  }

  const codes = generateBackupCodes();
  const hashed = await hashBackupCodes(codes);
  await db.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabledAt: new Date(),
      twoFactorBackupCodes: hashed as unknown as object,
    },
  });
  await audit({
    actorUserId: user.id,
    action: "user.2fa.enabled",
    resource: "user",
    resourceId: user.id,
  });

  if (ctx.fromHandoff) {
    // Forced-setup flow → de TOTP is zojuist geverifieerd (verifyTotpCode
    // hierboven), dus mint een "authenticated"-token om in te loggen via de
    // handoff-provider.
    const authToken = signHandoffToken({
      userId: user.id,
      mode: "authenticated",
      ttlMs: 60_000,
    });
    const store = await cookies();
    store.set(TWOFA_PENDING_COOKIE, authToken, cookieOpts(60_000));
    await signIn("2fa-handoff", {
      token: authToken,
      redirect: false,
    });
    await clearPendingCookies();
  }
  return { ok: true, data: { backupCodes: codes } };
}

/* ---------------- Opt-out for non-admin users ---------------- */

export async function disableTwoFactorAction(
  password: string,
): Promise<ActionResult> {
  const u = await requireUser();
  const blocked = blockDemoWrite(u);
  if (blocked) return blocked;
  // Admins cannot disable 2FA themselves.
  if (u.isAdmin) {
    return { ok: false, error: "Admins kunnen 2FA niet uitzetten" };
  }
  const dbUser = await db.user.findUnique({
    where: { id: u.id },
    select: { passwordHash: true, twoFactorEnabledAt: true },
  });
  if (!dbUser?.twoFactorEnabledAt) {
    return { ok: false, error: "2FA staat niet aan" };
  }
  if (!dbUser.passwordHash) {
    return { ok: false, error: "Geen wachtwoord ingesteld" };
  }
  const valid = await bcrypt.compare(password, dbUser.passwordHash);
  if (!valid) return { ok: false, error: "Wachtwoord onjuist" };

  await db.user.update({
    where: { id: u.id },
    data: {
      twoFactorSecret: null,
      twoFactorEnabledAt: null,
      twoFactorBackupCodes: null as unknown as object,
    },
  });
  await audit({
    actorUserId: u.id,
    action: "user.2fa.disabled",
    resource: "user",
    resourceId: u.id,
  });
  return { ok: true };
}

export async function regenerateBackupCodesAction(): Promise<
  ActionResult<{ backupCodes: string[] }>
> {
  const u = await requireUser();
  const blocked = blockDemoWrite(u);
  if (blocked) return blocked;
  const dbUser = await db.user.findUnique({
    where: { id: u.id },
    select: { twoFactorEnabledAt: true },
  });
  if (!dbUser?.twoFactorEnabledAt) {
    return { ok: false, error: "2FA staat niet aan" };
  }
  const codes = generateBackupCodes();
  const hashed = await hashBackupCodes(codes);
  await db.user.update({
    where: { id: u.id },
    data: { twoFactorBackupCodes: hashed as unknown as object },
  });
  await audit({
    actorUserId: u.id,
    action: "user.2fa.backup-codes-regenerated",
    resource: "user",
    resourceId: u.id,
  });
  return { ok: true, data: { backupCodes: codes } };
}
