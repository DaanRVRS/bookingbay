import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { toCsv, todayStamp } from "@/lib/csv";

const RESOURCES = ["customers", "categories", "bookings"] as const;
type Resource = (typeof RESOURCES)[number];

// Veiligheidscap: voorkomt dat een mega-export de volledige dataset in
// geheugen bouwt en de swap-krappe host plat legt (zelfde reden als de
// dashboard-export-cap).
const ADMIN_EXPORT_LIMIT = 20000;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string; resource: string }> },
): Promise<Response> {
  await requireAdmin();
  const { id, resource } = await ctx.params;

  if (!(RESOURCES as readonly string[]).includes(resource)) {
    notFound();
  }

  const org = await db.organization.findUnique({
    where: { id },
    select: { id: true, slug: true },
  });
  if (!org) notFound();

  const filenameBase = `${org.slug}-${resource}-${todayStamp()}.csv`;
  const headers = {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filenameBase}"`,
  };

  const csv = await buildCsv(org.id, resource as Resource);
  return new Response(csv, { headers });
}

async function buildCsv(organizationId: string, resource: Resource): Promise<string> {
  if (resource === "customers") {
    const rows = await db.customer.findMany({
      where: { organizationId },
      include: { _count: { select: { bookings: true } } },
      orderBy: { createdAt: "desc" },
      take: ADMIN_EXPORT_LIMIT,
    });
    return toCsv(
      [
        { key: "id", label: "id" },
        { key: "name", label: "naam" },
        { key: "email", label: "e-mail" },
        { key: "phone", label: "telefoon" },
        { key: "bookings", label: "aantal_boekingen" },
        { key: "createdAt", label: "aangemaakt" },
        { key: "updatedAt", label: "bijgewerkt" },
        { key: "notes", label: "notities" },
      ],
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email ?? "",
        phone: r.phone ?? "",
        bookings: r._count.bookings,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        notes: r.notes ?? "",
      })),
    );
  }

  if (resource === "categories") {
    const rows = await db.category.findMany({
      where: { organizationId },
      include: {
        parent: { select: { name: true } },
        _count: { select: { items: true, children: true } },
      },
      orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
      take: ADMIN_EXPORT_LIMIT,
    });
    return toCsv(
      [
        { key: "id", label: "id" },
        { key: "name", label: "naam" },
        { key: "parent", label: "bovenliggend" },
        { key: "sortOrder", label: "volgorde" },
        { key: "items", label: "aantal_items" },
        { key: "children", label: "aantal_subcategorieen" },
        { key: "createdAt", label: "aangemaakt" },
        { key: "updatedAt", label: "bijgewerkt" },
        { key: "description", label: "beschrijving" },
      ],
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        parent: r.parent?.name ?? "",
        sortOrder: r.sortOrder,
        items: r._count.items,
        children: r._count.children,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        description: r.description ?? "",
      })),
    );
  }

  // bookings
  const rows = await db.booking.findMany({
    where: { organizationId },
    include: {
      item: { select: { name: true } },
      customer: { select: { name: true, email: true, phone: true } },
      createdBy: { select: { email: true, name: true } },
    },
    orderBy: { startAt: "desc" },
    take: ADMIN_EXPORT_LIMIT,
  });
  return toCsv(
    [
      { key: "id", label: "id" },
      { key: "status", label: "status" },
      { key: "item", label: "item" },
      { key: "customer", label: "klant" },
      { key: "customerEmail", label: "klant_email" },
      { key: "customerPhone", label: "klant_telefoon" },
      { key: "startAt", label: "start" },
      { key: "endAt", label: "eind" },
      { key: "totalPrice", label: "totaalprijs_eur" },
      { key: "createdBy", label: "aangemaakt_door" },
      { key: "createdAt", label: "aangemaakt_op" },
      { key: "notes", label: "notities" },
    ],
    rows.map((r) => ({
      id: r.id,
      status: r.status,
      item: r.item.name,
      customer: r.customer.name,
      customerEmail: r.customer.email ?? "",
      customerPhone: r.customer.phone ?? "",
      startAt: r.startAt,
      endAt: r.endAt,
      totalPrice: r.totalPrice.toString(),
      createdBy: r.createdBy ? (r.createdBy.name ?? r.createdBy.email) : "Widget",
      createdAt: r.createdAt,
      notes: r.notes ?? "",
    })),
  );
}
