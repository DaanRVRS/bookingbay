import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { BookingForm } from "../booking-form";

export const metadata = { title: "Boeking" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBookingPage({ params }: PageProps) {
  const { id } = await params;
  const ctx = await requireOrg();

  const [booking, items, customers] = await Promise.all([
    db.booking.findFirst({
      where: { id, organizationId: ctx.organization.id },
      include: { item: { select: { name: true } }, customer: { select: { name: true } } },
    }),
    db.item.findMany({
      where: { organizationId: ctx.organization.id, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        category: { select: { name: true } },
        pricePerHour: true,
        pricePerDay: true,
        pricePerWeek: true,
      },
    }),
    db.customer.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);

  if (!booking) notFound();

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title={`${booking.customer.name} · ${booking.item.name}`}
          description="Wijzig de details van deze boeking."
          back={{ href: "/dashboard/bookings", label: "Terug naar boekingen" }}
        />
        <div className="mt-6">
          <BookingForm
            items={items.map((i) => ({
              id: i.id,
              name: i.name,
              categoryName: i.category.name,
              pricePerHour: i.pricePerHour ? Number(i.pricePerHour) : null,
              pricePerDay: i.pricePerDay ? Number(i.pricePerDay) : null,
              pricePerWeek: i.pricePerWeek ? Number(i.pricePerWeek) : null,
            }))}
            customers={customers.map((c) => ({ id: c.id, name: c.name, email: c.email }))}
            existing={{
              id: booking.id,
              itemId: booking.itemId,
              customerId: booking.customerId,
              startAt: booking.startAt.toISOString(),
              endAt: booking.endAt.toISOString(),
              status: booking.status,
              totalPrice: Number(booking.totalPrice),
              notes: booking.notes ?? "",
            }}
          />
        </div>
      </div>
    </div>
  );
}
