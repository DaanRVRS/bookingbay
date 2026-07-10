import { notFound } from "next/navigation";
import { getOrgBySlug } from "@/lib/tenants/queries";
import { getTenantBasePath } from "@/lib/tenants/base-path";
import { getPublishedPage } from "@/lib/pages/queries";
import { PageRenderer } from "@/components/tenants/PageRenderer";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * /contact bestaat alleen nog als de tenant zélf een pagina met slug
 * "contact" heeft gepubliceerd (met bv. het sleepbare contact-blok erin).
 * Er is bewust GEEN hardcoded standaard-contactpagina meer — geen eigen
 * pagina = 404, net als elke andere niet-bestaande pagina.
 *
 * Deze statische route blijft nodig omdat 'ie in Next altijd wint van de
 * dynamische [pageSlug]-route.
 */
export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) return { title: "Niet gevonden" };
  const custom = await getPublishedPage(org.id, "contact");
  return { title: custom?.title ?? "Contact" };
}

export default async function ContactPage({ params }: PageProps) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) notFound();

  const custom = await getPublishedPage(org.id, "contact");
  if (!custom || custom.blocks.length === 0) notFound();

  const accent = org.primaryColor ?? "#ef5934";
  const base = await getTenantBasePath(slug);

  return (
    <PageRenderer
      blocks={custom.blocks}
      organizationId={org.id}
      accent={accent}
      contactBasePath={base}
      tenantSlug={slug}
    />
  );
}
