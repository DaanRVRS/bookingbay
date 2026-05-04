import { Layers, Plus } from "lucide-react";
import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { CategoryTree } from "./category-tree";
import { CategoryDialog } from "./category-dialog";

export const metadata = { title: "Categorieën" };

export default async function CategoriesPage() {
  const ctx = await requireOrg();

  const categories = await db.category.findMany({
    where: { organizationId: ctx.organization.id },
    include: { _count: { select: { items: true, children: true } } },
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
  });

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="Categorieën"
          description="Definieer hoe je catalogus georganiseerd is. Een categorie kan subcategorieën hebben."
          action={
            <CategoryDialog
              categories={categories.map((c) => ({ id: c.id, name: c.name, parentId: c.parentId }))}
              trigger={
                <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
                  <Plus className="size-4" /> Nieuwe categorie
                </button>
              }
            />
          }
        />

        <div className="mt-6">
          <CategoryTree
            categories={categories.map((c) => ({
              id: c.id,
              name: c.name,
              description: c.description,
              imageUrl: c.imageUrl,
              parentId: c.parentId,
              itemCount: c._count.items,
              childCount: c._count.children,
            }))}
          />
        </div>

        {categories.length === 0 && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Layers className="mr-2 inline size-4" />
            Nog geen categorieën. Voeg er één toe om te beginnen.
          </p>
        )}
      </div>
    </div>
  );
}
