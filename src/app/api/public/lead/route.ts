import { NextResponse } from "next/server";
import { submitLead } from "@/lib/leads/core";
import type { LeadInput } from "@/lib/leads/schemas";

export const dynamic = "force-dynamic";

/**
 * Publieke lead-/contactformulier-endpoint. Bewust een gewone API-route i.p.v.
 * Server Action: het contactformulier zit in de embedbare klantsite/-widget
 * (o.a. /site/[slug]/embed/contact in een cross-domain iframe), waar Server
 * Actions breken op action-ID version-skew bij elke deploy. Een stabiele URL
 * doet dat niet.
 *
 * CORS open zodat het formulier vanaf elke (klant)site kan posten.
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
  let body: LeadInput;
  try {
    body = (await req.json()) as LeadInput;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Ongeldige aanvraag" },
      { status: 400, headers: corsHeaders() },
    );
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
