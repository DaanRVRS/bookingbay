import Link from "next/link";
import { Inbox, Shield } from "lucide-react";
import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { LeadList } from "./lead-list";

export const metadata = { title: "Leads" };

interface PageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function LeadsPage({ searchParams }: PageProps) {
  const ctx = await requireOrg();
  const params = await searchParams;
  const filter = params.filter ?? "open";

  const leads = await db.lead.findMany({
    where: {
      organizationId: ctx.organization.id,
      ...(filter === "open" && { handledAt: null }),
      ...(filter === "handled" && { handledAt: { not: null } }),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Resolve item names
  const itemIds = Array.from(new Set(leads.map((l) => l.itemId).filter((id): id is string => Boolean(id))));
  const items = itemIds.length
    ? await db.item.findMany({
        where: { id: { in: itemIds }, organizationId: ctx.organization.id },
        select: { id: true, name: true },
      })
    : [];
  const itemNameMap = new Map(items.map((i) => [i.id, i.name]));

  const totalCount = await db.lead.count({
    where: { organizationId: ctx.organization.id },
  });
  const openCount = await db.lead.count({
    where: { organizationId: ctx.organization.id, handledAt: null },
  });

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title="Leads"
          description="Aanvragen die binnenkomen via je publieke klantsite. Mark als afgehandeld zodra je gereageerd hebt."
          action={
            <Link
              href="/dashboard/leads/blocklist"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium hover:bg-accent"
            >
              <Shield className="size-4" />
              Blocklist
            </Link>
          }
        />

        <div className="mt-6">
          {totalCount === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Nog geen leads"
              description="Aanvragen vanuit je klantsite verschijnen hier. Geef de URL aan klanten of plaats 'm op je social media."
            />
          ) : (
            <LeadList
              leads={leads.map((l) => ({
                id: l.id,
                name: l.name,
                email: l.email,
                phone: l.phone,
                message: l.message,
                itemId: l.itemId,
                itemName: l.itemId ? itemNameMap.get(l.itemId) ?? null : null,
                startAt: l.startAt?.toISOString() ?? null,
                endAt: l.endAt?.toISOString() ?? null,
                handledAt: l.handledAt?.toISOString() ?? null,
                createdAt: l.createdAt.toISOString(),
              }))}
              currentFilter={filter}
              openCount={openCount}
              totalCount={totalCount}
            />
          )}
        </div>
      </div>
    </div>
  );
}
