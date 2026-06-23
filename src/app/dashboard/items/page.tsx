import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ItemsList } from "./items-list";

export const metadata = { title: "Items" };

interface PageProps {
  searchParams: Promise<{ q?: string; cat?: string; status?: string }>;
}

export default async function ItemsPage({ searchParams }: PageProps) {
  const ctx = await requireOrg();
  const params = await searchParams;
  const orgId = ctx.organization.id;

  const search = (params.q ?? "").trim();
  const categoryId = params.cat;
  const status = params.status; // "active" | "inactive" | undefined

  const items = await db.item.findMany({
    where: {
      organizationId: orgId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(categoryId && { categoryId }),
      ...(status === "active" && { isActive: true }),
      ...(status === "inactive" && { isActive: false }),
    },
    include: { category: { select: { name: true } } },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  const categories = await db.category.findMany({
    where: { organizationId: orgId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const totalItemCount = await db.item.count({ where: { organizationId: orgId } });

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          title="Items"
          description="Alles wat je verhuurt — boten, fietsen, gereedschap, party-spullen."
          action={
            <Link
              href="/dashboard/items/new"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <Plus className="size-4" /> Nieuw item
            </Link>
          }
        />

        <div className="mt-6">
          {totalItemCount === 0 ? (
            <EmptyState
              icon={Package}
              title="Nog geen items"
              description="Voeg je eerste item toe — een boot, fiets, gereedschap of wat je ook verhuurt."
              action={{ href: "/dashboard/items/new", label: "Eerste item toevoegen" }}
            />
          ) : (
            <ItemsList
              items={items.map((i) => ({
                id: i.id,
                name: i.name,
                description: i.description,
                imageUrl: i.imageUrl,
                category: i.category.name,
                pricePerUnit: i.pricePerUnit?.toString() ?? null,
                bookingIntervalMinutes: i.bookingIntervalMinutes,
                quantity: i.quantity,
                isActive: i.isActive,
                isAddon: i.isAddon,
                addonPrice: i.addonPrice?.toString() ?? null,
              }))}
              categories={categories}
              currentCategory={categoryId}
              currentSearch={search}
              currentStatus={status}
            />
          )}
        </div>
      </div>
    </div>
  );
}
