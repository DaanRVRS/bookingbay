import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { timingSafeEqualStr } from "@/lib/security/timing-safe";
import { runRetention } from "@/lib/retention/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dagelijkse retentie-/opruimtaak (bewaartermijnen uit de privacyverklaring).
 * Zelfde Bearer-beveiliging als de andere cron-endpoints.
 *
 * Linux crontab line (04:10 UTC daily):
 *   10 4 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
 *              https://www.bookingbay.nl/api/cron/retention > /dev/null
 */
export async function GET(req: Request) {
  if (!env.CRON_SECRET) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }
  const auth = req.headers.get("authorization") ?? "";
  if (!timingSafeEqualStr(auth, `Bearer ${env.CRON_SECRET}`)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runRetention();
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/retention] failed:", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
