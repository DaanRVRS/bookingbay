import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ItemForm } from "../item-form";

export const metadata = { title: "Nieuw item" };

export default async function NewItemPage() {
  const ctx = await requireOrg();
  const categories = await db.category.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
    select: { id: true, name: true, parentId: true },
  });

  if (categories.length === 0) {
    redirect("/dashboard/categories");
  }

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="Nieuw item"
          description="Vul de basis nu in — afbeelding en details kun je later aanpassen."
          back={{ href: "/dashboard/items", label: "Terug naar items" }}
        />
        <div className="mt-6">
          <ItemForm categories={categories} />
        </div>
      </div>
    </div>
  );
}
