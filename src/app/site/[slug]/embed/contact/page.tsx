import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrgBySlug } from "@/lib/tenants/queries";
import { db } from "@/lib/db";
import { ContactForm } from "../../contact/contact-form";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ item?: string }>;
}

export const metadata = { title: "Contact" };

export default async function EmbedContactPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { item: itemParam } = await searchParams;
  const org = await getOrgBySlug(slug);
  if (!org) notFound();

  let preselectedItem: { id: string; name: string } | null = null;
  if (itemParam) {
    const found = await db.item.findFirst({
      where: { id: itemParam, organizationId: org.id, isActive: true, isAddon: false },
      select: { id: true, name: true },
    });
    if (found) preselectedItem = found;
  }

  const accent = org.primaryColor ?? "#ef5934";

  return (
    <div className="px-4 py-6 sm:px-6">
      <Link
        href="/embed"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        ← Terug naar aanbod
      </Link>

      <h1 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
        Stuur een aanvraag
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {org.name} reageert binnen één werkdag.
      </p>

      <div className="mt-5 rounded-xl border border-border bg-card p-5">
        <ContactForm
          organizationId={org.id}
          accent={accent}
          preselectedItem={preselectedItem}
        />
      </div>
    </div>
  );
}
