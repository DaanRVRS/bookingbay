import { notFound, redirect } from "next/navigation";
import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { planAllows } from "@/lib/plans";
import { getPageById } from "@/lib/pages/queries";
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

  const categories = await db.category.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
    select: { id: true, name: true, parentId: true },
  });

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
    />
  );
}
