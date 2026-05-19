import { NextResponse } from "next/server";
import { getItemAvailability } from "@/lib/bookings/public-core";

export const dynamic = "force-dynamic";

/**
 * Publieke beschikbaarheid-endpoint voor de widget-kalender. Gewone
 * API-route (geen Server Action) — stabiele URL, deploy-onafhankelijk,
 * CORS-vriendelijk voor embedding op externe sites.
 */
function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=30",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") ?? "";
  const itemId = url.searchParams.get("itemId") ?? "";

  try {
    const result = await getItemAvailability(slug, itemId);
    return NextResponse.json(result, {
      status: result.ok ? 200 : 400,
      headers: corsHeaders(),
    });
  } catch (err) {
    console.error("[api/public/availability] uncaught:", err);
    return NextResponse.json(
      { ok: false, error: "Beschikbaarheid kon niet geladen worden" },
      { status: 500, headers: corsHeaders() },
    );
  }
}
