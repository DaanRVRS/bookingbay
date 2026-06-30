import { requireOrg } from "@/lib/auth/session";
import {
  buildBookingsWhere,
  bookingSortOrder,
  normalizeSort,
  normalizeDir,
} from "@/lib/bookings/list-query";
import { loadBookingsForExport, bookingsToXml } from "@/lib/bookings/export-data";
import { todayStamp } from "@/lib/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lijst-export (alle gefilterde boekingen) als XML-download. Respecteert
 * dezelfde status/zoek/sortering-filters als de boekingenlijst — géén
 * paginatie, dus de hele selectie (tot BOOKINGS_EXPORT_LIMIT).
 */
export async function GET(req: Request): Promise<Response> {
  const orgCtx = await requireOrg();
  const url = new URL(req.url);
  const format = (url.searchParams.get("format") ?? "xml").toLowerCase();

  if (format !== "xml") {
    return new Response("Alleen format=xml wordt door deze route ondersteund", {
      status: 400,
    });
  }

  const where = buildBookingsWhere(orgCtx.organization.id, {
    status: url.searchParams.get("status") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
  });
  const orderBy = bookingSortOrder(
    normalizeSort(url.searchParams.get("sort") ?? undefined),
    normalizeDir(url.searchParams.get("dir") ?? undefined),
  );

  const { org, bookings } = await loadBookingsForExport(
    orgCtx.organization.id,
    where,
    orderBy,
  );
  const xml = bookingsToXml(org, bookings, new Date().toISOString());

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="boekingen-${org.slug || "export"}-${todayStamp()}.xml"`,
      "Cache-Control": "no-store",
    },
  });
}
