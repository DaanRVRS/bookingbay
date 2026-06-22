import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getTenantAddons } from "@/lib/tenants/queries";
import type { BookingAddonLine } from "@/lib/bookings/price";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { BookingDetail } from "./booking-detail";

export const metadata = { title: "Boeking" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const ctx = await requireOrg();

  const [booking, items, customers, org, addons] = await Promise.all([
    db.booking.findFirst({
      where: { id, organizationId: ctx.organization.id },
      include: {
        item: { select: { name: true } },
        customer: { select: { name: true, email: true } },
      },
    }),
    db.item.findMany({
      where: { organizationId: ctx.organization.id, isActive: true, isAddon: false },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        categoryId: true,
        category: { select: { name: true, parentId: true } },
        pricePerHour: true,
        pricePerDay: true,
        pricePerWeek: true,
        cleaningFee: true,
      },
    }),
    db.customer.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
    db.organization.findUnique({
      where: { id: ctx.organization.id },
      select: { slug: true, primaryColor: true },
    }),
    getTenantAddons(ctx.organization.id),
  ]);

  if (!booking || !org) notFound();

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title={`${booking.customer.name} · ${booking.item.name}`}
          description="Boekingsdetails. Klik op Bewerken om aan te passen."
          back={{ href: "/dashboard/bookings", label: "Terug naar boekingen" }}
        />
        <div className="mt-6">
          <BookingDetail
            orgSlug={org.slug}
            accent={org.primaryColor ?? undefined}
            addons={addons}
            items={items.map((i) => ({
              id: i.id,
              name: i.name,
              categoryName: i.category.name,
              categoryIds: [i.categoryId, i.category.parentId].filter(
                (v): v is string => Boolean(v),
              ),
              pricePerHour: i.pricePerHour ? Number(i.pricePerHour) : null,
              pricePerDay: i.pricePerDay ? Number(i.pricePerDay) : null,
              pricePerWeek: i.pricePerWeek ? Number(i.pricePerWeek) : null,
              cleaningFee: i.cleaningFee ? Number(i.cleaningFee) : null,
            }))}
            customers={customers.map((c) => ({
              id: c.id,
              name: c.name,
              email: c.email,
            }))}
            view={{
              id: booking.id,
              itemId: booking.itemId,
              customerId: booking.customerId,
              itemName: booking.item.name,
              customerName: booking.customer.name,
              customerEmail: booking.customer.email,
              startAt: booking.startAt.toISOString(),
              endAt: booking.endAt.toISOString(),
              status: booking.status,
              totalPrice: Number(booking.totalPrice),
              notes: booking.notes ?? "",
              addons: (booking.addons as BookingAddonLine[] | null) ?? null,
              paymentStatus: booking.paymentStatus,
              paymentProvider: booking.paymentProvider,
              completionDamage: booking.completionDamage,
              completionNotes: booking.completionNotes ?? "",
              completedAt: booking.completedAt
                ? booking.completedAt.toISOString()
                : null,
            }}
          />
        </div>
      </div>
    </div>
  );
}
