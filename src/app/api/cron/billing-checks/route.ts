import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runBillingChecks, runTrialChecks } from "@/lib/billing/lifecycle";

// Run this on the server. No caching, no static optimization.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Trigger from a system cron once per day, e.g.:
 *
 *   curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
 *     https://bookingbay.nl/api/cron/billing-checks
 *
 * Linux crontab line (03:15 UTC daily):
 *   15 3 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
 *              https://bookingbay.nl/api/cron/billing-checks > /dev/null
 */
export async function GET(req: Request) {
  if (!env.CRON_SECRET) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.CRON_SECRET}`;
  if (auth !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [billing, trial] = await Promise.all([
      runBillingChecks(),
      runTrialChecks(),
    ]);
    return NextResponse.json({ ok: true, billing, trial });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/billing-checks] failed:", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
