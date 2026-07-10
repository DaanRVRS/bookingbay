import { notFound } from "next/navigation";
import { getOrgBySlug } from "@/lib/tenants/queries";
import { getTenantBasePath } from "@/lib/tenants/base-path";
import { getPublishedPage } from "@/lib/pages/queries";
import { PageRenderer } from "@/components/tenants/PageRenderer";

interface PageProps {
  params: Promise<{ slug: string; pageSlug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug, pageSlug } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) return { title: "Niet gevonden" };
  const page = await getPublishedPage(org.id, pageSlug);
  if (!page) return { title: "Niet gevonden" };
  return { title: page.title };
}

export default async function TenantBuilderPage({ params }: PageProps) {
  const { slug, pageSlug } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) notFound();

  const page = await getPublishedPage(org.id, pageSlug);
  if (!page) notFound();

  const accent = org.primaryColor ?? "#ef5934";
  const base = await getTenantBasePath(slug);

  if (page.blocks.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Deze pagina is nog leeg.
        </p>
      </div>
    );
  }

  return (
    <PageRenderer
      blocks={page.blocks}
      organizationId={org.id}
      accent={accent}
      contactBasePath={base}
      tenantSlug={slug}
    />
  );
}
