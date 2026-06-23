import { notFound, redirect } from "next/navigation";
import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { planAllows } from "@/lib/plans";
import { getPageById } from "@/lib/pages/queries";
import { listReviewsForOrg } from "@/lib/reviews/queries";
import { Builder } from "./builder";

export const metadata = { title: "Pagina bewerken" };

export default async function EditPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireOrg();

  const org = await db.organization.findUnique({
    where: { id: ctx.organization.id },
    select: { plan: true, slug: true, primaryColor: true },
  });
  if (!org) throw new Error("Organization not found");
  if (!planAllows(org.plan, "pageBuilder")) redirect("/dashboard/site/pages");

  const page = await getPageById(ctx.organization.id, id);
  if (!page) notFound();

  const [categories, reviews, items] = await Promise.all([
    db.category.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
      select: { id: true, name: true, parentId: true },
    }),
    listReviewsForOrg(ctx.organization.id),
    db.item.findMany({
      where: { organizationId: ctx.organization.id, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        pricePerUnit: true,
        bookingIntervalMinutes: true,
        deposit: true,
        category: { select: { name: true } },
      },
    }),
  ]);

  return (
    <Builder
      page={{
        id: page.id,
        title: page.title,
        slug: page.slug,
        isPublished: page.isPublished,
        showInNav: page.showInNav,
        blocks: page.blocks,
      }}
      tenantSlug={org.slug}
      accent={org.primaryColor ?? "#ef5934"}
      categories={categories}
      reviews={reviews.map((r) => ({
        id: r.id,
        author: r.author,
        quote: r.quote,
        isPublished: r.isPublished,
      }))}
      items={items.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        imageUrl: i.imageUrl,
        pricePerUnit: i.pricePerUnit ? Number(i.pricePerUnit) : null,
        bookingIntervalMinutes: i.bookingIntervalMinutes,
        deposit: i.deposit ? Number(i.deposit) : null,
        categoryName: i.category.name,
      }))}
    />
  );
}
