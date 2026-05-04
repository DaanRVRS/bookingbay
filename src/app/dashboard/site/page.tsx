import { ExternalLink } from "lucide-react";
import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SiteCustomizerForm } from "./site-customizer-form";
import { EmbedSnippet } from "./embed-snippet";

export const metadata = { title: "Klantsite" };

export default async function SitePage() {
  const ctx = await requireOrg();

  const org = await db.organization.findUnique({
    where: { id: ctx.organization.id },
    select: {
      id: true,
      name: true,
      slug: true,
      heroTitle: true,
      heroSubtitle: true,
      aboutText: true,
      primaryColor: true,
      logoUrl: true,
      contactEmail: true,
      contactPhone: true,
      itemDisplayStyle: true,
    },
  });
  if (!org) throw new Error("Organization not found");

  // Build the public URL — use NEXTAUTH_URL host as the admin host and
  // assume tenant slugs live as a subdomain of it.
  const adminHost = (process.env.NEXTAUTH_URL ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const protocol = (process.env.NEXTAUTH_URL ?? "").startsWith("https") ? "https" : "http";
  const tenantUrl = adminHost
    ? `${protocol}://${org.slug}.${adminHost}`
    : `/site/${org.slug}`;

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title="Klantsite"
          description="Hoe ziet je publieke pagina eruit? Klanten landen hier vanuit Google of jouw eigen marketing."
          action={
            <a
              href={tenantUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium hover:bg-accent"
            >
              Open site
              <ExternalLink className="size-4" />
            </a>
          }
        />

        <p className="mt-3 truncate rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {tenantUrl}
        </p>

        <div className="mt-6">
          <SiteCustomizerForm
            initial={{
              heroTitle: org.heroTitle ?? "",
              heroSubtitle: org.heroSubtitle ?? "",
              aboutText: org.aboutText ?? "",
              primaryColor: org.primaryColor ?? "",
              logoUrl: org.logoUrl,
              contactEmail: org.contactEmail ?? "",
              contactPhone: org.contactPhone ?? "",
              itemDisplayStyle: org.itemDisplayStyle,
            }}
            orgName={org.name}
          />
        </div>

        <div className="mt-6">
          <EmbedSnippet
            slug={org.slug}
            baseUrl={`${protocol}://${adminHost}`}
          />
        </div>
      </div>
    </div>
  );
}
