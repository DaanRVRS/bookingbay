import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time string-vergelijking voor secrets (CRON_SECRET, tokens, ...).
 * Vermijdt de vroege-exit van `===`/`!==` die een timing-attack op het
 * secret mogelijk maakt. Een lengteverschil geeft direct false — de lengte
 * van een secret is niet vertrouwelijk en `timingSafeEqual` eist gelijke
 * buffer-lengtes.
 */
export function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
