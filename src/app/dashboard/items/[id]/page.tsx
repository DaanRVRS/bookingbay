import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { safeParseBusinessHours } from "@/lib/business-hours/schemas";
import { ItemForm } from "../item-form";

export const metadata = { title: "Item bewerken" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditItemPage({ params }: PageProps) {
  const { id } = await params;
  const ctx = await requireOrg();

  const [item, categories, org] = await Promise.all([
    db.item.findFirst({
      where: { id, organizationId: ctx.organization.id },
    }),
    db.category.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
      select: { id: true, name: true, parentId: true },
    }),
    db.organization.findUnique({
      where: { id: ctx.organization.id },
      select: { businessHours: true },
    }),
  ]);

  if (!item) notFound();

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title={item.name}
          description="Wijzig de details van dit item."
          back={{ href: "/dashboard/items", label: "Terug naar items" }}
        />
        <div className="mt-6">
          <ItemForm
            categories={categories}
            orgBusinessHours={safeParseBusinessHours(org?.businessHours)}
            existing={{
              id: item.id,
              name: item.name,
              description: item.description ?? "",
              categoryId: item.categoryId,
              imageUrl: item.imageUrl,
              imageUrls: item.imageUrls ?? [],
              pricePerUnit: item.pricePerUnit ? Number(item.pricePerUnit) : null,
              deposit: item.deposit ? Number(item.deposit) : null,
              cleaningFee: item.cleaningFee ? Number(item.cleaningFee) : null,
              captainFee: item.captainFee ? Number(item.captainFee) : null,
              fuelFee: item.fuelFee ? Number(item.fuelFee) : null,
              quantity: item.quantity,
              isActive: item.isActive,
              isAddon: item.isAddon,
              addonPrice: item.addonPrice ? Number(item.addonPrice) : null,
              addonCategoryIds: Array.isArray(item.addonCategoryIds)
                ? (item.addonCategoryIds as string[])
                : null,
              bookingIntervalMinutes: item.bookingIntervalMinutes,
              bookingWindowStartMin: item.bookingWindowStartMin,
              bookingWindowEndMin: item.bookingWindowEndMin,
              followsOrgHours: item.followsOrgHours,
              itemHours: safeParseBusinessHours(item.itemHours),
            }}
          />
        </div>
      </div>
    </div>
  );
}
