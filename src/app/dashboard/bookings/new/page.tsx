import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { BookingForm } from "../booking-form";

export const metadata = { title: "Nieuwe boeking" };

interface PageProps {
  searchParams: Promise<{
    item?: string;
    customer?: string;
    start?: string;
    end?: string;
    leadEmail?: string;
    leadName?: string;
    leadPhone?: string;
  }>;
}

export default async function NewBookingPage({ searchParams }: PageProps) {
  const ctx = await requireOrg();
  const params = await searchParams;

  const [items, customers] = await Promise.all([
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

  if (items.length === 0) redirect("/dashboard/items/new");

  // If we got a lead's email, try to match an existing customer by email.
  let resolvedCustomerId = params.customer;
  if (!resolvedCustomerId && params.leadEmail) {
    const match = customers.find(
      (c) => c.email && c.email.toLowerCase() === params.leadEmail!.toLowerCase(),
    );
    if (match) resolvedCustomerId = match.id;
  }

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="Nieuwe boeking"
          description="Kies een item, kies of maak een klant, en stel het tijdvak in."
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
            defaultItemId={params.item}
            defaultCustomerId={resolvedCustomerId}
            defaultStartAt={params.start}
            defaultEndAt={params.end}
            quickAddCustomer={
              params.leadEmail && !resolvedCustomerId
                ? {
                    name: params.leadName ?? "",
                    email: params.leadEmail,
                    phone: params.leadPhone ?? "",
                  }
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
