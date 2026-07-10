"use server";

import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { signIn, signOut } from "@/lib/auth";
import { sendEmail, emailLayout, btn } from "@/lib/email";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type RegisterInput,
  type LoginInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type ActionResult,
} from "./schemas";
import { gateTwoFactor } from "@/lib/twofa/actions";
import {
  checkRateLimit,
  recordFailure,
  clearAttempts,
  LOGIN_LIMIT,
  tooManyAttemptsMessage,
} from "@/lib/security/rate-limit";

function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!fields[path]) fields[path] = issue.message;
  }
  return fields;
}

function token(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

async function sendVerificationEmail(email: string, identifier: string, verificationToken: string) {
  // Persist the token first so a delivery failure doesn't lose it — the
  // /check-email page can re-send via resendVerificationAction.
  await db.verificationToken.create({
    data: {
      identifier,
      token: verificationToken,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const url = `${env.APP_URL}/verify-email?token=${verificationToken}`;
  // sendEmail() never throws — returns {ok, error} for caller logging only.
  const result = await sendEmail({
    to: email,
    subject: "Bevestig je e-mail bij BookingBay",
    html: emailLayout(`
      <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600">Welkom bij BookingBay</h1>
      <p style="margin:0 0 24px 0">Bevestig je e-mailadres om je account te activeren.</p>
      <p style="margin:0 0 24px 0">${btn(url, "Bevestig e-mail")}</p>
      <p style="margin:24px 0 0 0;font-size:13px;color:#6b7280;word-break:break-all">Of kopieer deze link: ${url}</p>
    `),
    text: `Bevestig je e-mail: ${url}`,
  });
  if (!result.ok) {
    console.error(`[auth] verification email NOT delivered to ${email}: ${result.error}`);
  }
}

async function sendResetEmail(email: string, resetToken: string) {
  const url = `${env.APP_URL}/reset-password?token=${resetToken}`;
  const result = await sendEmail({
    to: email,
    subject: "Wachtwoord resetten — BookingBay",
    html: emailLayout(`
      <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600">Wachtwoord resetten</h1>
      <p style="margin:0 0 24px 0">Klik op de knop hieronder om een nieuw wachtwoord in te stellen. De link verloopt na 1 uur.</p>
      <p style="margin:0 0 24px 0">${btn(url, "Wachtwoord resetten")}</p>
      <p style="margin:24px 0 0 0;font-size:13px;color:#6b7280">Geen reset aangevraagd? Negeer deze mail.</p>
    `),
    text: `Reset link: ${url}`,
  });
  if (!result.ok) {
    console.error(`[auth] reset email NOT delivered to ${email}: ${result.error}`);
  }
}

export async function registerAction(input: RegisterInput): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return {
      ok: false,
      error: "Er bestaat al een account met dit e-mailadres",
      fieldErrors: { email: "E-mail al in gebruik" },
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await db.user.create({
    data: {
      email,
      name: parsed.data.name,
      passwordHash,
    },
  });

  await sendVerificationEmail(email, user.email, token());
  return { ok: true };
}

export async function loginAction(
  input: LoginInput,
): Promise<ActionResult<{ twoFactor?: "verify" | "setup" }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }

  const email = parsed.data.email.toLowerCase();

  // Brute-force-throttle per e-mailadres — blokkeer credential-stuffing.
  const rlKey = `login:${email}`;
  const rl = await checkRateLimit(rlKey);
  if (rl.limited) {
    return { ok: false, error: tooManyAttemptsMessage(rl.retryAfterSec) };
  }

  // Validate password BEFORE signIn so we can branch on 2FA without
  // leaking a half-authenticated session cookie.
  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      isAdmin: true,
      twoFactorEnabledAt: true,
    },
  });
  if (!user?.passwordHash) {
    await recordFailure(rlKey, LOGIN_LIMIT);
    return { ok: false, error: "E-mail of wachtwoord onjuist" };
  }
  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    await recordFailure(rlKey, LOGIN_LIMIT);
    return { ok: false, error: "E-mail of wachtwoord onjuist" };
  }
  // Wachtwoord klopt → teller resetten (ook als er nog een 2FA-stap volgt).
  await clearAttempts(rlKey);

  // Gate: TOTP-verified user → "verify" step. Admin without 2FA yet →
  // "setup" step (forced). Anyone else → normal signIn.
  const gate = await gateTwoFactor({
    id: user.id,
    email: user.email,
    isAdmin: user.isAdmin,
    twoFactorEnabledAt: user.twoFactorEnabledAt,
  });
  if (gate.status !== "ok") {
    return { ok: true, data: { twoFactor: gate.status } };
  }

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirect: false,
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "E-mail of wachtwoord onjuist" };
  }
}

export async function magicLinkAction(input: ForgotPasswordInput): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldig e-mailadres" };
  }

  try {
    await signIn("resend", {
      email: parsed.data.email.toLowerCase(),
      redirect: false,
    });
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

export async function verifyEmailAction(verifyToken: string): Promise<ActionResult> {
  if (!verifyToken || verifyToken.length < 10) {
    return { ok: false, error: "Ongeldig token" };
  }

  const record = await db.verificationToken.findUnique({ where: { token: verifyToken } });
  if (!record) return { ok: false, error: "Token niet gevonden of al gebruikt" };
  if (record.expires < new Date()) {
    await db.verificationToken.delete({ where: { token: verifyToken } });
    return { ok: false, error: "Token verlopen — vraag een nieuwe aan" };
  }

  await db.user.update({
    where: { email: record.identifier },
    data: { emailVerified: new Date() },
  });
  await db.verificationToken.delete({ where: { token: verifyToken } });

  return { ok: true };
}

export async function resendVerificationAction(email: string): Promise<ActionResult> {
  const parsed = z.email().safeParse(email);
  if (!parsed.success) return { ok: false, error: "Ongeldig e-mailadres" };

  const lower = parsed.data.toLowerCase();
  const user = await db.user.findUnique({ where: { email: lower } });
  if (!user || user.emailVerified) return { ok: true };

  await db.verificationToken.deleteMany({ where: { identifier: lower } });
  await sendVerificationEmail(lower, lower, token());
  return { ok: true };
}

export async function forgotPasswordAction(input: ForgotPasswordInput): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldig e-mailadres" };
  }

  const email = parsed.data.email.toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return { ok: true };

  const resetToken = token();
  await db.passwordReset.create({
    data: {
      userId: user.id,
      token: resetToken,
      expires: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  await sendResetEmail(email, resetToken);
  return { ok: true };
}

export async function resetPasswordAction(input: ResetPasswordInput): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldig wachtwoord", fieldErrors: fieldErrors(parsed.error) };
  }

  const record = await db.passwordReset.findUnique({ where: { token: parsed.data.token } });
  if (!record || record.usedAt || record.expires < new Date()) {
    return { ok: false, error: "Reset-link is ongeldig of verlopen" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash, emailVerified: new Date() },
    }),
    db.passwordReset.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true };
}

export async function generateInvitationToken(): Promise<string> {
  return randomUUID();
}
