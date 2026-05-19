import { NextResponse } from "next/server";
import { createPublicBooking } from "@/lib/bookings/public-core";
import type { PublicBookingInput } from "@/lib/bookings/public-schemas";

export const dynamic = "force-dynamic";

/**
 * Publieke boeking-endpoint. Bewust een gewone API-route i.p.v. Server
 * Action: de widget is embedbaar over meerdere domeinen + iframes, waar
 * Server Actions breken op action-ID version-skew bij elke deploy.
 * Een stabiele URL doet dat niet.
 *
 * CORS open zodat de widget vanaf elke (klant)site kan posten.
 */
function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: Request) {
  let body: PublicBookingInput;
  try {
    body = (await req.json()) as PublicBookingInput;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Ongeldige aanvraag" },
      { status: 400, headers: corsHeaders() },
    );
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
