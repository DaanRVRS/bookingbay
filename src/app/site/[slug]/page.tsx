import Link from "next/link";
import { ImageIcon, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { getOrgBySlug, getTenantCatalog, searchTenantItems } from "@/lib/tenants/queries";
import { unitLabel } from "@/lib/bookings/price";
import { getTenantBasePath, tenantHref } from "@/lib/tenants/base-path";
import { TenantSearch } from "@/components/tenants/TenantSearch";
import { getPublishedPage } from "@/lib/pages/queries";
import { PageRenderer } from "@/components/tenants/PageRenderer";
import {
  safeParseBusinessHours,
  DAY_LABELS_NL,
} from "@/lib/business-hours/schemas";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
}

export default async function TenantHomePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { q = "" } = await searchParams;
  const org = await getOrgBySlug(slug);
  if (!org) notFound();

  const accent = org.primaryColor ?? "#ef5934";
  const trimmed = q.trim();
  const base = await getTenantBasePath(slug);

  // If the org has a custom home page in the page builder (and it has any
  // blocks), render that instead of the hardcoded hero. The catalog still
  // shows below so the booking flow stays one click away.
  const customHome = await getPublishedPage(org.id, "home");
  const useCustomHome = customHome && customHome.blocks.length > 0 && !trimmed;

  // Build the item list — either filtered (search) or grouped from the catalog
  let visibleItems: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    pricePerUnit: import("@prisma/client").Prisma.Decimal | null;
    bookingIntervalMinutes: number;
    categoryName: string;
  }[];

  if (trimmed) {
    const matches = await searchTenantItems(org.id, trimmed);
    visibleItems = matches.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      imageUrl: m.imageUrl,
      pricePerUnit: m.pricePerUnit,
      bookingIntervalMinutes: m.bookingIntervalMinutes,
      categoryName: m.category.name,
    }));
  } else {
    const categories = await getTenantCatalog(org.id);
    visibleItems = categories.flatMap((c) => [
      ...c.items.map((i) => ({ ...i, categoryName: c.name })),
      ...c.children.flatMap((sub) =>
        sub.items.map((i) => ({ ...i, categoryName: `${c.name} · ${sub.name}` })),
      ),
    ]);
  }

  const heroTitle = org.heroTitle ?? org.name;
  const heroSubtitle = org.heroSubtitle ?? `Online reserveren bij ${org.name}.`;

  return (
    <>
      {useCustomHome ? (
        <PageRenderer
          blocks={customHome!.blocks}
          organizationId={org.id}
          accent={accent}
          contactBasePath={base}
        />
      ) : (
        <>
          {/* Hero (fallback when home page is empty) */}
          <section className="relative isolate overflow-hidden border-b border-border">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10"
              style={{
                background: `linear-gradient(135deg, color-mix(in oklch, ${accent} 18%, transparent) 0%, transparent 60%)`,
              }}
            />
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
              <div className="max-w-3xl">
                <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                  {heroTitle}
                </h1>
                <p className="mt-4 max-w-2xl text-lg text-muted-foreground text-pretty">
                  {heroSubtitle}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="#aanbod"
                    className="inline-flex h-12 items-center justify-center rounded-lg px-6 font-medium text-white shadow-sm transition-opacity hover:opacity-90"
                    style={{ background: accent }}
                  >
                    Bekijk het aanbod
                  </Link>
                  {/* Geen standaard /contact-pagina meer — val terug op mail. */}
                  {org.contactEmail && (
                    <a
                      href={`mailto:${org.contactEmail}`}
                      className="inline-flex h-12 items-center justify-center rounded-lg border border-border bg-card px-6 font-medium hover:bg-accent"
                    >
                      Stuur een aanvraag
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* About */}
          {org.aboutText && (
            <section className="border-b border-border py-12">
              <div className="mx-auto max-w-3xl px-4 sm:px-6">
                <p className="text-base leading-relaxed text-foreground/90 whitespace-pre-line">
                  {org.aboutText}
                </p>
              </div>
            </section>
          )}

          {/* Opening hours (if configured) */}
          {(() => {
            const hours = safeParseBusinessHours(org.businessHours);
            if (!hours) return null;
            return (
              <section className="border-b border-border py-12">
                <div className="mx-auto max-w-2xl px-4 sm:px-6">
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Openingstijden
                  </h2>
                  <ul className="mt-5 divide-y divide-border rounded-xl border border-border bg-card">
                    {hours.map((d, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between px-4 py-2.5 text-sm"
                      >
                        <span className="font-medium">{DAY_LABELS_NL[i]}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {d.closed ? "Gesloten" : `${d.open} – ${d.close}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            );
          })()}
        </>
      )}

      {/* Catalog — alleen als er géén zelfgebouwde home-pagina is (dan is de
          builder-pagina de hele site). Bij zoeken is useCustomHome=false, dus
          dan landen de resultaten hier wél. */}
      {!useCustomHome && (
      <section id="aanbod" className="py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: accent }}>
                Aanbod
              </p>
              <h2 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                {trimmed ? `Resultaten voor "${trimmed}"` : "Wat we voor je hebben"}
              </h2>
            </div>
            <div className="w-full sm:max-w-xs">
              <TenantSearch
                basePath={tenantHref(base, "/")}
                accent={accent}
                initialQuery={q}
              />
            </div>
          </div>

          {visibleItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                {trimmed
                  ? `Niets gevonden voor "${trimmed}". Probeer een andere zoekterm of stuur een aanvraag.`
                  : "Het aanbod wordt nog samengesteld. Stuur ondertussen gerust een aanvraag — we helpen je graag."}
              </p>
              {org.contactEmail && (
                <a
                  href={`mailto:${org.contactEmail}`}
                  className="mt-5 inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-medium text-white"
                  style={{ background: accent }}
                >
                  Contact opnemen
                </a>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleItems.map((item) => (
                <Link
                  key={item.id}
                  href={tenantHref(base, `/item/${item.id}`)}
                  className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="grid size-full place-items-center text-muted-foreground">
                        <ImageIcon className="size-8 opacity-40" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      {item.categoryName}
                    </p>
                    <h3 className="text-base font-semibold tracking-tight">{item.name}</h3>
                    {item.description && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                    <div className="mt-auto flex items-end justify-between pt-3">
                      <PriceLabel item={item} accent={accent} />
                      <span
                        className="inline-flex items-center gap-1 text-xs font-medium transition-transform group-hover:translate-x-0.5"
                        style={{ color: accent }}
                      >
                        Meer info <ArrowRight className="size-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
      )}
    </>
  );
}

function PriceLabel({
  item,
  accent,
}: {
  item: {
    pricePerUnit: import("@prisma/client").Prisma.Decimal | null;
    bookingIntervalMinutes: number;
  };
  accent: string;
}) {
  const value = item.pricePerUnit ? Number(item.pricePerUnit) : null;
  if (value == null) {
    return <span className="text-xs text-muted-foreground">Op aanvraag</span>;
  }
  return (
    <span className="text-sm font-semibold tabular-nums" style={{ color: accent }}>
      € {value.toFixed(2)}{" "}
      <span className="text-xs font-normal text-muted-foreground">
        / {unitLabel(item.bookingIntervalMinutes)}
      </span>
    </span>
  );
}
