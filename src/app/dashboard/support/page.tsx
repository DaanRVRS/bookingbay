import { LifeBuoy } from "lucide-react";
import { requireOrg } from "@/lib/auth/session";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { listTicketsForOrg } from "@/lib/support/queries";
import { TicketList } from "./ticket-list";
import { NewTicketButton } from "./new-ticket-button";

export const metadata = { title: "Support" };

export default async function SupportPage() {
  const ctx = await requireOrg();
  const tickets = await listTicketsForOrg(ctx.organization.id);

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="Support"
          description="Vragen, problemen of een feature-verzoek? Open een ticket en we reageren meestal binnen één werkdag."
          action={<NewTicketButton />}
        />

        <div className="mt-6">
          {tickets.length === 0 ? (
            <EmptyState
              icon={LifeBuoy}
              title="Nog geen tickets"
              description="Klik op 'Nieuwe ticket' om je vraag of probleem te delen. Je krijgt mail én een melding zodra wij reageren."
            />
          ) : (
            <TicketList
              tickets={tickets.map((t) => ({
                id: t.id,
                subject: t.subject,
                category: t.category,
                status: t.status,
                priority: t.priority,
                createdById: t.createdById,
                createdByName: t.createdBy?.name ?? null,
                createdByEmail: t.createdBy?.email ?? null,
                lastMessageAt: t.lastMessageAt.toISOString(),
                messageCount: t._count.messages,
                createdAt: t.createdAt.toISOString(),
              }))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
