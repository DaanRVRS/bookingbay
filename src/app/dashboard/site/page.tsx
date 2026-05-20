import Link from "next/link";
import { ArrowRight, ExternalLink, FileText, Puzzle } from "lucide-react";
import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { planAllows, planLimits } from "@/lib/plans";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SiteCustomizerForm } from "./site-customizer-form";
import { CustomDomainSection } from "./custom-domain-section";

export const metadata = { title: "Klantsite" };

export default async function SitePage() {
  const ctx = await requireOrg();

  const org = await db.organization.findUnique({
    where: { id: ctx.organization.id },
    select: {
      id: true,
      name: true,
      slug: true,
      primaryColor: true,
      logoUrl: true,
      contactEmail: true,
      contactPhone: true,
      itemDisplayStyle: true,
      plan: true,
      customDomain: true,
      customDomainVerifiedAt: true,
    },
  });
  if (!org) throw new Error("Organization not found");

  // Tenant URL = <slug>.<TENANT_DOMAIN>. TENANT_DOMAIN strips a leading
  // "www." (see env.ts) so we never end up with reuvers.www.bookingbay.nl.
  const protocol = env.APP_URL.startsWith("https") ? "https" : "http";
  const tenantUrl = `${protocol}://${org.slug}.${env.TENANT_DOMAIN}`;
  const builderEnabled = planAllows(org.plan, "pageBuilder");

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

        <div className="mt-6 flex flex-col gap-3">
          {/* Boek-widget — zit in élk plan, óók Starter. */}
          <Link
            href="/dashboard/widgets"
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Puzzle className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                Boek-widget {builderEnabled ? "" : "(zit in je Starter-plan)"}
              </p>
              <p className="text-xs text-muted-foreground">
                Plak 'm op je eigen website (WordPress, Wix, Squarespace,
                eigen HTML) — alle styling beheer je hier in het dashboard.
              </p>
            </div>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Link>

          {/* Page builder shortcut — primary way to edit the homepage now */}
          {builderEnabled && (
            <Link
              href="/dashboard/site/pages"
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <FileText className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  Bewerk je homepagina &amp; pagina&apos;s
                </p>
                <p className="text-xs text-muted-foreground">
                  Hero, tekst, foto-slider, prijslijst, reviews — alles in
                  de drag-and-drop page-builder.
                </p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>
          )}
        </div>

        <div className="mt-6">
          <SiteCustomizerForm
            initial={{
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
          <CustomDomainSection
            initialDomain={org.customDomain}
            initialVerifiedAt={
              org.customDomainVerifiedAt
                ? org.customDomainVerifiedAt.toISOString()
                : null
            }
            cnameTarget={env.CUSTOM_DOMAIN_CNAME_TARGET}
            planAllows={planLimits(org.plan).customDomain}
          />
        </div>
      </div>
    </div>
  );
}
