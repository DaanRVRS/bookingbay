import Link from "next/link";
import {
  ArrowRight,
  Check,
  Circle,
  ExternalLink,
  FileText,
  Globe,
  MousePointerClick,
  Palette,
} from "lucide-react";
import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { planAllows, planLimits } from "@/lib/plans";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SiteCustomizerForm } from "./site-customizer-form";
import { CustomDomainSection } from "./custom-domain-section";
import { SitePreview } from "./site-preview";

export const metadata = { title: "Klantsite" };

export default async function SitePage() {
  const ctx = await requireOrg();

  const [org, pageCount] = await Promise.all([
    db.organization.findUnique({
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
    }),
    db.page.count({
      where: { organizationId: ctx.organization.id, isPublished: true },
    }),
  ]);
  if (!org) throw new Error("Organization not found");

  // Tenant URL = <slug>.<TENANT_DOMAIN>. TENANT_DOMAIN strips a leading
  // "www." (see env.ts) so we never end up with reuvers.www.bookingbay.nl.
  const protocol = env.APP_URL.startsWith("https") ? "https" : "http";
  const tenantUrl = `${protocol}://${org.slug}.${env.TENANT_DOMAIN}`;
  const builderEnabled = planAllows(org.plan, "pageBuilder");
  const domainAllowed = planLimits(org.plan).customDomain;

  // Setup-checklist — echte data, geen aannames. Eigen domein telt als
  // optioneel en drukt de voortgang niet.
  const checklist = [
    {
      id: "instellingen",
      label: "Logo geüpload",
      done: Boolean(org.logoUrl),
      href: "#instellingen",
    },
    {
      id: "kleur",
      label: "Accentkleur gekozen",
      done: Boolean(org.primaryColor),
      href: "#instellingen",
    },
    {
      id: "contact",
      label: "Contactgegevens ingevuld",
      done: Boolean(org.contactEmail),
      href: "#instellingen",
    },
    ...(builderEnabled
      ? [
          {
            id: "pages",
            label: "Eerste eigen pagina live",
            done: pageCount > 0,
            href: "/dashboard/site/pages",
          },
        ]
      : []),
  ];
  const doneCount = checklist.filter((c) => c.done).length;
  const progressPct = Math.round((doneCount / checklist.length) * 100);

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          title="Klantsite"
          description="Dit is wat klanten zien als ze bij jou landen — bekijk 'm live en stel alles hier in."
          action={
            <a
              href={tenantUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Open site
              <ExternalLink className="size-4" />
            </a>
          }
        />

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Hoofdkolom */}
          <div className="flex min-w-0 flex-col gap-6">
            {/* Live voorbeeld van de echte site */}
            <SitePreview
              embedSrc={`/site/${org.slug}`}
              displayUrl={tenantUrl}
            />

            <div id="instellingen" className="scroll-mt-20">
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

            <div id="domein" className="scroll-mt-20">
              <CustomDomainSection
                initialDomain={org.customDomain}
                initialVerifiedAt={
                  org.customDomainVerifiedAt
                    ? org.customDomainVerifiedAt.toISOString()
                    : null
                }
                cnameTarget={env.CUSTOM_DOMAIN_CNAME_TARGET}
                planAllows={domainAllowed}
              />
            </div>
          </div>

          {/* Zijkolom */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
            {/* Setup-voortgang */}
            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold">Je site af maken</h2>
                <span className="text-xs font-semibold tabular-nums text-primary">
                  {doneCount}/{checklist.length}
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-[oklch(0.55_0.18_18)] transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <ul className="mt-4 flex flex-col gap-1">
                {checklist.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={c.href}
                      className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                    >
                      {c.done ? (
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[oklch(0.93_0.07_150)] text-[oklch(0.4_0.14_150)]">
                          <Check className="size-3" />
                        </span>
                      ) : (
                        <Circle className="size-5 shrink-0 text-muted-foreground/40" />
                      )}
                      <span
                        className={
                          c.done
                            ? "text-muted-foreground line-through decoration-muted-foreground/40"
                            : "font-medium"
                        }
                      >
                        {c.label}
                      </span>
                      {!c.done && (
                        <ArrowRight className="ml-auto size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
              {org.customDomain && (
                <p className="mt-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
                  Eigen domein:{" "}
                  <span className="font-medium text-foreground">
                    {org.customDomain}
                  </span>{" "}
                  {org.customDomainVerifiedAt ? "✓ actief" : "— nog niet geverifieerd"}
                </p>
              )}
            </section>

            {/* Snelkoppelingen */}
            <section className="flex flex-col gap-2">
              {builderEnabled && (
                <QuickLink
                  href="/dashboard/site/pages"
                  icon={FileText}
                  title="Pagina's & homepagina"
                  sub="Hero, tekst, slider, prijslijst, contact-blok — drag-and-drop."
                />
              )}
              <QuickLink
                href="/dashboard/widgets"
                icon={MousePointerClick}
                title="Boek-widget"
                sub="Kleuren, teksten en embed-code voor je eigen site."
              />
              <QuickLink
                href="#instellingen"
                icon={Palette}
                title="Merk & contact"
                sub="Logo, accentkleur en contactgegevens."
              />
              <QuickLink
                href="#domein"
                icon={Globe}
                title="Eigen domein"
                sub={
                  domainAllowed
                    ? "Koppel jouwbedrijf.nl aan je klantsite."
                    : "Beschikbaar vanaf Professional."
                }
              />
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  title,
  sub,
}: {
  href: string;
  icon: typeof FileText;
  title: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-all hover:border-primary/40 hover:bg-accent"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">{title}</p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{sub}</p>
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
