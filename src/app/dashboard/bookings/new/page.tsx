import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getTenantAddons } from "@/lib/tenants/queries";
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

  const [items, customers, org, addons] = await Promise.all([
    db.item.findMany({
      where: { organizationId: ctx.organization.id, isActive: true, isAddon: false },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        categoryId: true,
        category: { select: { name: true, parentId: true } },
        pricePerUnit: true,
        bookingIntervalMinutes: true,
        cleaningFee: true,
        captainFee: true,
        fuelFee: true,
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
  if (!org) redirect("/dashboard");

  if (items.length === 0) redirect("/dashboard/items/new");

  // If we got a lead's email, try to match an existing customer by email,
  // otherwise auto-create one from the lead's contact details.
  let resolvedCustomerId = params.customer;
  let customerList = customers;
  if (!resolvedCustomerId && params.leadEmail) {
    const lowerEmail = params.leadEmail.toLowerCase();
    const match = customers.find((c) => c.email?.toLowerCase() === lowerEmail);
    if (match) {
      resolvedCustomerId = match.id;
    } else if (params.leadName && params.leadName.trim().length > 0) {
      const created = await db.customer.create({
        data: {
          organizationId: ctx.organization.id,
          name: params.leadName.trim(),
          email: lowerEmail,
          phone: params.leadPhone?.trim() || null,
        },
        select: { id: true, name: true, email: true },
      });
      resolvedCustomerId = created.id;
      customerList = [...customers, created];
    }
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
            orgSlug={org.slug}
            accent={org.primaryColor ?? undefined}
            items={items.map((i) => ({
              id: i.id,
              name: i.name,
              categoryName: i.category.name,
              categoryIds: [i.categoryId, i.category.parentId].filter(
                (v): v is string => Boolean(v),
              ),
              pricePerUnit: i.pricePerUnit ? Number(i.pricePerUnit) : null,
              bookingIntervalMinutes: i.bookingIntervalMinutes,
              cleaningFee: i.cleaningFee ? Number(i.cleaningFee) : null,
              captainFee: i.captainFee ? Number(i.captainFee) : null,
              fuelFee: i.fuelFee ? Number(i.fuelFee) : null,
            }))}
            customers={customerList.map((c) => ({ id: c.id, name: c.name, email: c.email }))}
            addons={addons}
            defaultItemId={params.item}
            defaultCustomerId={resolvedCustomerId}
            defaultStartAt={params.start}
            defaultEndAt={params.end}
          />
        </div>
      </div>
    </div>
  );
}
