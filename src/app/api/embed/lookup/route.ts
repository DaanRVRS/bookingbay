import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Resolves a public embed-key (pk_xxx) to the org's slug + widget-design.
 * Used by the client-side `embed.js` om de iframe-URL te bouwen én de
 * styling toe te passen — zonder dat externe sites iets meer hoeven te
 * weten dan de key.
 *
 * Response shape:
 *   { slug, accent, width, radius, shadow }
 *
 * CORS: open voor alle origins zodat het script vanaf elke website werkt.
 */
function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    // Korte cache: design-wijzigingen in dashboard moeten snel doorkomen,
    // maar niet bij elke iframe-mount opnieuw fetchen.
    "Cache-Control": "public, max-age=30",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key")?.trim() ?? "";
  if (!key.startsWith("pk_")) {
    return NextResponse.json(
      { error: "invalid key" },
      { status: 400, headers: corsHeaders() },
    );
  }

  const org = await db.organization.findUnique({
    where: { publicEmbedKey: key },
    select: {
      slug: true,
      suspendedAt: true,
      primaryColor: true,
      widgetAccent: true,
      widgetWidth: true,
      widgetRadius: true,
      widgetShadow: true,
    },
  });
  if (!org) {
    return NextResponse.json(
      { error: "not found" },
      { status: 404, headers: corsHeaders() },
    );
  }
  if (org.suspendedAt) {
    return NextResponse.json(
      { error: "suspended" },
      { status: 403, headers: corsHeaders() },
    );
  }

  return NextResponse.json(
    {
      slug: org.slug,
      accent: org.widgetAccent ?? org.primaryColor ?? "#ef5934",
      width: org.widgetWidth,
      radius: org.widgetRadius,
      shadow: org.widgetShadow,
    },
    { headers: corsHeaders() },
  );
}
