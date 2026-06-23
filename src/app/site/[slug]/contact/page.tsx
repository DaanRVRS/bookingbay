import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, Phone } from "lucide-react";
import { getOrgBySlug } from "@/lib/tenants/queries";
import { getTenantBasePath, tenantHref } from "@/lib/tenants/base-path";
import { ContactForm } from "./contact-form";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const metadata = { title: "Contact" };

export default async function ContactPage({ params }: PageProps) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) notFound();

  const accent = org.primaryColor ?? "#ef5934";
  const base = await getTenantBasePath(slug);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Link
        href={tenantHref(base, "/")}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Terug naar aanbod
      </Link>

      <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
        Neem contact op
      </h1>
      <p className="mt-2 text-base text-muted-foreground">
        Een vraag of opmerking? Stuur {org.name} een bericht.
      </p>

      {(org.contactEmail || org.contactPhone) && (
        <div className="mt-6 flex flex-col gap-y-2 rounded-lg border border-border bg-card px-4 py-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
          {org.contactEmail && (
            <a
              href={`mailto:${org.contactEmail}`}
              className="flex min-w-0 items-center gap-2 text-foreground hover:underline"
            >
              <Mail className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{org.contactEmail}</span>
            </a>
          )}
          {org.contactPhone && (
            <a
              href={`tel:${org.contactPhone.replace(/\s/g, "")}`}
              className="flex min-w-0 items-center gap-2 text-foreground hover:underline"
            >
              <Phone className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{org.contactPhone}</span>
            </a>
          )}
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <ContactForm organizationId={org.id} accent={accent} />
      </div>
    </div>
  );
}
