import { NextResponse } from "next/server";
import { COMPANY } from "@/lib/company";

/**
 * RFC 9116 security.txt — meldpunt voor beveiligingsonderzoekers. Geen
 * statisch bestand in /public zodat het contactadres uit COMPANY komt.
 */
export const dynamic = "force-static";

export function GET() {
  const body = [
    `Contact: mailto:${COMPANY.email}`,
    `Contact: ${COMPANY.website}/contact`,
    // Verlengen vóór deze datum (RFC 9116 raadt max. 1 jaar vooruit aan).
    "Expires: 2027-09-01T00:00:00.000Z",
    "Preferred-Languages: nl, en",
    `Canonical: ${COMPANY.website}/.well-known/security.txt`,
    `Policy: ${COMPANY.website}/privacy#beveiliging`,
    "",
  ].join("\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
