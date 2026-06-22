import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { timingSafeEqualStr } from "@/lib/security/timing-safe";
import { runCrmNotifications } from "@/lib/admin/crm/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily CRM follow-up notifications.
 *
 * System cron entry (e.g. 08:00 NL time):
 *   0 8 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
 *             https://bookingbay.nl/api/cron/admin-crm-reminders > /dev/null
 *
 * Per-reminder notifications are idempotent (notifiedAt guard). The summary
 * e-mail is sent on every successful run, so trigger only once per day.
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
    const summary = await runCrmNotifications();
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/admin-crm-reminders] failed:", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
