import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Resolves a public embed-key (pk_xxx) to the org's slug. Used by the
 * client-side `embed.js` om de iframe-URL te bouwen zonder dat externe
 * sites de slug hoeven te kennen. Onbekende of ingetrokken keys geven 404.
 *
 * Response shape: { slug: string } of { error: string }.
 *
 * CORS: open voor alle origins zodat het script vanaf elke website werkt.
 */
function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=60",
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
    select: { slug: true, suspendedAt: true },
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

  return NextResponse.json({ slug: org.slug }, { headers: corsHeaders() });
}
