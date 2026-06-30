import { requireOrg } from "@/lib/auth/session";
import { loadBookingForExport, bookingToXml } from "@/lib/bookings/export-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Per-boeking export. Alleen XML als download — de PDF loopt via de
 * print-geoptimaliseerde pagina (/exports/booking/[id]).
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const orgCtx = await requireOrg();
  const { id } = await ctx.params;
  const format = (new URL(req.url).searchParams.get("format") ?? "xml").toLowerCase();

  if (format !== "xml") {
    return new Response("Alleen format=xml wordt door deze route ondersteund", {
      status: 400,
    });
  }

  const data = await loadBookingForExport(orgCtx.organization.id, id);
  if (!data) {
    return new Response("Boeking niet gevonden", { status: 404 });
  }

  const xml = bookingToXml(data.org, data.booking);
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="boeking-${data.booking.id}.xml"`,
      "Cache-Control": "no-store",
    },
  });
}
