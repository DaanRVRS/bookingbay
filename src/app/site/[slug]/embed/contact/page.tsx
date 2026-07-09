import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrgBySlug } from "@/lib/tenants/queries";
import { ContactForm } from "@/components/tenants/ContactForm";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const metadata = { title: "Contact" };

export default async function EmbedContactPage({ params }: PageProps) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) notFound();

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
        Neem contact op
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Stuur {org.name} een bericht.
      </p>

      <div className="mt-5 rounded-xl border border-border bg-card p-5">
        <ContactForm organizationId={org.id} accent={accent} />
      </div>
    </div>
  );
}
