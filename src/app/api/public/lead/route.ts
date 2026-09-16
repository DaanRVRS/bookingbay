import { NextResponse } from "next/server";
import { submitLead } from "@/lib/leads/core";
import type { LeadInput } from "@/lib/leads/schemas";
import {
  clientIpFromHeaders,
  consumeRateLimit,
  PUBLIC_FORM_EMAIL_LIMIT,
  PUBLIC_FORM_IP_LIMIT,
  tooManyAttemptsMessage,
} from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Publieke lead-/contactformulier-endpoint. Bewust een gewone API-route i.p.v.
 * Server Action: het contactformulier zit in de embedbare klantsite/-widget
 * (o.a. /site/[slug]/embed/contact in een cross-domain iframe), waar Server
 * Actions breken op action-ID version-skew bij elke deploy. Een stabiele URL
 * doet dat niet.
 *
 * CORS open zodat het formulier vanaf elke (klant)site kan posten. Daarom
 * naast de honeypot ook rate limiting per IP en per e-mailadres.
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
  const ipGate = await consumeRateLimit(`pub-lead:ip:${ip}`, PUBLIC_FORM_IP_LIMIT);
  if (ipGate.limited) return tooMany(ipGate.retryAfterSec);

  let body: LeadInput;
  try {
    body = (await req.json()) as LeadInput;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Ongeldige aanvraag" },
      { status: 400, headers: corsHeaders() },
    );
  }

  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : "";
  if (email) {
    const emailGate = await consumeRateLimit(`pub-lead:email:${email}`, PUBLIC_FORM_EMAIL_LIMIT);
    if (emailGate.limited) return tooMany(emailGate.retryAfterSec);
  }

  try {
    const result = await submitLead(body);
    return NextResponse.json(result, {
      status: result.ok ? 200 : 400,
      headers: corsHeaders(),
    });
  } catch (err) {
    console.error("[api/public/lead] uncaught:", err);
    return NextResponse.json(
      { ok: false, error: "Er ging iets mis bij het versturen. Probeer 't opnieuw." },
      { status: 500, headers: corsHeaders() },
    );
  }
}
