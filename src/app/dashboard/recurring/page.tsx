import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Repeat } from "lucide-react";
import { RecurringList } from "./recurring-list";
import { CreateRecurringDialog } from "./create-recurring-dialog";

export const metadata = { title: "Terugkerende boekingen" };

export default async function RecurringPage() {
  const ctx = await requireOrg();

  const [templates, items, customers] = await Promise.all([
    db.recurringBooking.findMany({
      where: { organizationId: ctx.organization.id },
      include: {
        item: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ isActive: "desc" }, { nextRunAt: "asc" }],
    }),
    db.item.findMany({
      where: { organizationId: ctx.organization.id, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.customer.findMany({
      where: { organizationId: ctx.organization.id },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
      take: 500,
    }),
  ]);

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title="Terugkerende boekingen"
          description="Abonnement-achtige reeksen: één template materialiseert iedere week, twee weken, of maand automatisch een Booking-row."
          action={<CreateRecurringDialog items={items} customers={customers} />}
        />

        <div className="mt-6">
          {templates.length === 0 ? (
            <EmptyState
              icon={Repeat}
              title="Nog geen terugkerende boekingen"
              description="Maak er een aan voor klanten die elke week/maand dezelfde slot reserveren — dan hoef je het niet steeds handmatig in te kloppen."
            />
          ) : (
            <RecurringList
              templates={templates.map((t) => ({
                id: t.id,
                itemName: t.item.name,
                customerName: t.customer.name,
                customerEmail: t.customer.email,
                frequency: t.frequency,
                dayOfWeek: t.dayOfWeek,
                dayOfMonth: t.dayOfMonth,
                startTimeMin: t.startTimeMin,
                endTimeMin: t.endTimeMin,
                nextRunAt: t.nextRunAt.toISOString(),
                endsAt: t.endsAt ? t.endsAt.toISOString() : null,
                isActive: t.isActive,
                notes: t.notes,
              }))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
