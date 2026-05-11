import "server-only";
import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import {
  generateSecret as otpGenerateSecret,
  generateURI as otpGenerateURI,
  verifySync as otpVerifySync,
} from "otplib";
import qrcode from "qrcode";
import bcrypt from "bcryptjs";
import { env } from "@/lib/env";

export interface BackupCode {
  hash: string;
  usedAt: string | null;
}

/**
 * Generates a fresh base32-encoded TOTP secret. Caller is responsible for
 * persisting (or stashing in cookie) — this just makes the value.
 */
export function generateSecret(): string {
  return otpGenerateSecret();
}

export function buildOtpauthUrl(secret: string, accountLabel: string): string {
  // "BookingBay" is the issuer that appears in the authenticator app.
  return otpGenerateURI({
    issuer: "BookingBay",
    label: accountLabel,
    secret,
  });
}

export async function buildQrDataUrl(otpauthUrl: string): Promise<string> {
  return qrcode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
  });
}

export function verifyTotpCode(secret: string, code: string): boolean {
  if (!secret || !/^[0-9]{6}$/.test(code.trim())) return false;
  // epochTolerance: 30s allows the previous and next 30s windows (±1 step)
  // to compensate for clock drift — matches Google Authenticator behavior.
  const result = otpVerifySync({
    secret,
    token: code.trim(),
    epochTolerance: 30,
  });
  return result.valid;
}

/** Generates `n` backup codes formatted XXXX-XXXX (8 hex chars). */
export function generateBackupCodes(n = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < n; i++) {
    const bytes = randomBytes(4).toString("hex").toUpperCase();
    codes.push(`${bytes.slice(0, 4)}-${bytes.slice(4)}`);
  }
  return codes;
}

export async function hashBackupCodes(codes: string[]): Promise<BackupCode[]> {
  return Promise.all(
    codes.map(async (c) => ({
      hash: await bcrypt.hash(c.toUpperCase(), 8),
      usedAt: null,
    })),
  );
}

/**
 * Attempts to find a matching unused backup code. Returns the index that
 * matched, or -1. Caller is responsible for marking it as used.
 */
export async function findMatchingBackupCode(
  input: string,
  stored: BackupCode[],
): Promise<number> {
  const normalized = input.trim().toUpperCase().replace(/\s/g, "");
  if (!/^[0-9A-F]{4}-[0-9A-F]{4}$/.test(normalized)) return -1;
  for (let i = 0; i < stored.length; i++) {
    const entry = stored[i];
    if (entry.usedAt) continue;
    if (await bcrypt.compare(normalized, entry.hash)) return i;
  }
  return -1;
}

/* ------------------------- Handoff tokens ------------------------- */

export interface HandoffPayload {
  userId: string;
  mode: "verify" | "setup";
  exp: number; // ms timestamp
}

const TOKEN_VERSION = "v1";

function sign(payload: string): string {
  return createHmac("sha256", env.NEXTAUTH_SECRET).update(payload).digest("hex");
}

/**
 * Builds a short-lived signed token that carries the userId between the
 * password-check and the 2FA challenge. Stored in an HttpOnly cookie —
 * the signature prevents tampering and the exp prevents replay.
 */
export function signHandoffToken(input: {
  userId: string;
  mode: "verify" | "setup";
  ttlMs?: number;
}): string {
  const exp = Date.now() + (input.ttlMs ?? 5 * 60_000);
  const payload = `${TOKEN_VERSION}.${input.userId}.${input.mode}.${exp}`;
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function verifyHandoffToken(token: string | undefined): HandoffPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 5) return null;
  const [version, userId, mode, expStr, sig] = parts;
  if (version !== TOKEN_VERSION) return null;
  if (mode !== "verify" && mode !== "setup") return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  const expected = sign(`${version}.${userId}.${mode}.${expStr}`);
  if (sig.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) {
    return null;
  }
  return { userId, mode, exp };
}
