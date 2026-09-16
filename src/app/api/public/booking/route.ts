import { NextResponse } from "next/server";
import { createPublicBooking } from "@/lib/bookings/public-core";
import type { PublicBookingInput } from "@/lib/bookings/public-schemas";
import {
  clientIpFromHeaders,
  consumeRateLimit,
  PUBLIC_FORM_EMAIL_LIMIT,
  PUBLIC_FORM_IP_LIMIT,
  tooManyAttemptsMessage,
} from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Publieke boeking-endpoint. Bewust een gewone API-route i.p.v. Server
 * Action: de widget is embedbaar over meerdere domeinen + iframes, waar
 * Server Actions breken op action-ID version-skew bij elke deploy.
 * Een stabiele URL doet dat niet.
 *
 * CORS open zodat de widget vanaf elke (klant)site kan posten. Daarom ook
 * rate limiting per IP en per e-mailadres (DB-backed, cluster-veilig).
 */
function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function tooMany(retryAfterSec: number) {
  return NextResponse.json(
    { ok: false, error: tooManyAttemptsMessage(retryAfterSec) },
    {
      status: 429,
      headers: { ...corsHeaders(), "Retry-After": String(retryAfterSec) },
    },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: Request) {
  const ip = clientIpFromHeaders(req.headers);
  const ipGate = await consumeRateLimit(`pub-booking:ip:${ip}`, PUBLIC_FORM_IP_LIMIT);
  if (ipGate.limited) return tooMany(ipGate.retryAfterSec);

  let body: PublicBookingInput;
  try {
    body = (await req.json()) as PublicBookingInput;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Ongeldige aanvraag" },
      { status: 400, headers: corsHeaders() },
    );
  }

  const email =
    typeof body?.customerEmail === "string"
      ? body.customerEmail.trim().toLowerCase().slice(0, 200)
      : "";
  if (email) {
    const emailGate = await consumeRateLimit(
      `pub-booking:email:${email}`,
      PUBLIC_FORM_EMAIL_LIMIT,
    );
    if (emailGate.limited) return tooMany(emailGate.retryAfterSec);
  }

  try {
    const result = await createPublicBooking(body);
    return NextResponse.json(result, {
      status: result.ok ? 200 : 400,
      headers: corsHeaders(),
    });
  } catch (err) {
    console.error("[api/public/booking] uncaught:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Er ging iets mis bij het aanmaken van je boeking. Probeer 't opnieuw.",
      },
      { status: 500, headers: corsHeaders() },
    );
  }
}
