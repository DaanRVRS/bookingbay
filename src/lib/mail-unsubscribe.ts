import "server-only";
import { createHmac } from "node:crypto";
import { env } from "@/lib/env";
import { timingSafeEqualStr } from "@/lib/security/timing-safe";

/**
 * Afmeldlinks voor niet-transactionele mail (broadcasts aan gebruikers en
 * de review-uitvraag aan eindklanten). De link bevat een HMAC-token over
 * (soort, id) met NEXTAUTH_SECRET, zodat niemand een ander kan afmelden
 * zonder de mail te hebben ontvangen. Geen extra kolom nodig.
 *
 * Wordt óók als List-Unsubscribe-header meegestuurd (RFC 2369) inclusief
 * one-click (RFC 8058), zodat mailclients een "Afmelden"-knop tonen.
 */

export type UnsubscribeKind = "broadcast" | "marketing" | "review";

export function unsubscribeToken(kind: UnsubscribeKind, id: string): string {
  return createHmac("sha256", env.NEXTAUTH_SECRET)
    .update(`unsubscribe:${kind}:${id}`)
    .digest("hex");
}

export function verifyUnsubscribeToken(
  kind: UnsubscribeKind,
  id: string,
  token: string,
): boolean {
  if (!/^[0-9a-f]{64}$/.test(token)) return false;
  return timingSafeEqualStr(unsubscribeToken(kind, id), token);
}

export function unsubscribeUrl(kind: UnsubscribeKind, id: string): string {
  const base = env.APP_URL.replace(/\/$/, "");
  const params = new URLSearchParams({
    kind,
    id,
    t: unsubscribeToken(kind, id),
  });
  return `${base}/api/unsubscribe?${params.toString()}`;
}

/** Headers die je aan sendEmail({ headers }) meegeeft voor afmeldbare mail. */
export function unsubscribeHeaders(
  kind: UnsubscribeKind,
  id: string,
): Record<string, string> {
  const url = unsubscribeUrl(kind, id);
  return {
    "List-Unsubscribe": `<${url}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
