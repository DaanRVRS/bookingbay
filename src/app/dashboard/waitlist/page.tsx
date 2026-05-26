import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Hourglass } from "lucide-react";
import { WaitlistTable } from "./waitlist-table";
import { CreateEntryDialog } from "./create-entry-dialog";

export const metadata = { title: "Wachtlijst" };

export default async function WaitlistPage() {
  const ctx = await requireOrg();

  const [entries, items] = await Promise.all([
    db.waitlistEntry.findMany({
      where: { organizationId: ctx.organization.id },
      include: { item: { select: { id: true, name: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
    }),
    db.item.findMany({
      where: { organizationId: ctx.organization.id, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title="Wachtlijst"
          description="Klanten die op een item wachten. Bij annulering krijgen ze automatisch een mail dat er plek vrij is."
          action={<CreateEntryDialog items={items} />}
        />

        <div className="mt-6">
          {entries.length === 0 ? (
            <EmptyState
              icon={Hourglass}
              title="Nog niemand op de wachtlijst"
              description="Voeg handmatig een klant toe of wacht tot iemand via de publieke widget op de wachtlijst gaat."
            />
          ) : (
            <WaitlistTable
              entries={entries.map((e) => ({
                id: e.id,
                customerName: e.customerName,
                customerEmail: e.customerEmail,
                customerPhone: e.customerPhone,
                itemName: e.item.name,
                desiredStartAt: e.desiredStartAt.toISOString(),
                desiredEndAt: e.desiredEndAt.toISOString(),
                status: e.status,
                notifiedAt: e.notifiedAt ? e.notifiedAt.toISOString() : null,
                notes: e.notes,
              }))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
