import { Plus, Users } from "lucide-react";
import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { CustomerList } from "./customer-list";
import { CustomerDialog } from "./customer-dialog";

export const metadata = { title: "Klanten" };

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function CustomersPage({ searchParams }: PageProps) {
  const ctx = await requireOrg();
  const params = await searchParams;
  const search = (params.q ?? "").trim();

  const customers = await db.customer.findMany({
    where: {
      organizationId: ctx.organization.id,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    include: { _count: { select: { bookings: true } } },
    orderBy: { name: "asc" },
  });

  const totalCount = await db.customer.count({
    where: { organizationId: ctx.organization.id },
  });

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title="Klanten"
          description="Iedereen die ooit bij je heeft gehuurd. Snel-add tijdens elke boeking."
          action={
            <CustomerDialog
              trigger={
                <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
                  <Plus className="size-4" /> Nieuwe klant
                </button>
              }
            />
          }
        />

        <div className="mt-6">
          {totalCount === 0 ? (
            <EmptyState
              icon={Users}
              title="Nog geen klanten"
              description="Voeg je eerste klant toe — handmatig hier of automatisch tijdens een boeking."
            />
          ) : (
            <CustomerList
              customers={customers.map((c) => ({
                id: c.id,
                name: c.name,
                email: c.email,
                phone: c.phone,
                notes: c.notes,
                bookingCount: c._count.bookings,
              }))}
              currentSearch={search}
            />
          )}
        </div>
      </div>
    </div>
  );
}
