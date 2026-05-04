import Link from "next/link";
import { CheckCircle2, Plus } from "lucide-react";
import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { BookingList } from "./booking-list";

export const metadata = { title: "Boekingen" };

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function BookingsPage({ searchParams }: PageProps) {
  const ctx = await requireOrg();
  const params = await searchParams;
  const status = params.status;

  const bookings = await db.booking.findMany({
    where: {
      organizationId: ctx.organization.id,
      ...(status && { status: status as "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" }),
    },
    include: {
      item: { select: { name: true } },
      customer: { select: { name: true } },
    },
    orderBy: { startAt: "desc" },
    take: 100,
  });

  const totalCount = await db.booking.count({
    where: { organizationId: ctx.organization.id },
  });

  const itemCount = await db.item.count({
    where: { organizationId: ctx.organization.id, isActive: true },
  });

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          title="Boekingen"
          description="Alle reserveringen — vandaag, deze week, en alles wat geweest is."
          action={
            itemCount > 0 ? (
              <Link
                href="/dashboard/bookings/new"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                <Plus className="size-4" /> Nieuwe boeking
              </Link>
            ) : undefined
          }
        />

        <div className="mt-6">
          {totalCount === 0 ? (
            itemCount === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Eerst items, dan boekingen"
                description="Je hebt nog geen items in je catalogus. Voeg eerst items toe om reserveringen te kunnen maken."
                action={{ href: "/dashboard/items/new", label: "Eerste item toevoegen" }}
              />
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="Nog geen boekingen"
                description="Maak je eerste boeking aan — kies een item, kies of maak een klant, klaar."
                action={{ href: "/dashboard/bookings/new", label: "Eerste boeking" }}
              />
            )
          ) : (
            <BookingList
              bookings={bookings.map((b) => ({
                id: b.id,
                itemName: b.item.name,
                customerName: b.customer.name,
                startAt: b.startAt.toISOString(),
                endAt: b.endAt.toISOString(),
                status: b.status,
                totalPrice: b.totalPrice.toString(),
              }))}
              currentStatus={status}
            />
          )}
        </div>
      </div>
    </div>
  );
}
