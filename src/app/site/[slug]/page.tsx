import Link from "next/link";
import { ImageIcon, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { getOrgBySlug, getTenantCatalog } from "@/lib/tenants/queries";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TenantHomePage({ params }: PageProps) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) notFound();

  const categories = await getTenantCatalog(org.id);
  const accent = org.primaryColor ?? "#ef5934";

  // Flatten all items across categories for "all items" listing
  const allItems = categories.flatMap((c) => [
    ...c.items.map((i) => ({ ...i, categoryName: c.name })),
    ...c.children.flatMap((sub) =>
      sub.items.map((i) => ({ ...i, categoryName: `${c.name} · ${sub.name}` })),
    ),
  ]);

  const heroTitle = org.heroTitle ?? org.name;
  const heroSubtitle =
    org.heroSubtitle ?? `Online reserveren bij ${org.name}.`;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
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
              <Link
                href="/contact"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-border bg-card px-6 font-medium hover:bg-accent"
              >
                Stuur een aanvraag
              </Link>
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

      {/* Catalog */}
      <section id="aanbod" className="py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8">
            <p className="text-sm font-medium" style={{ color: accent }}>
              Aanbod
            </p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
              Wat we voor je hebben
            </h2>
          </div>

          {allItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                Het aanbod wordt nog samengesteld. Stuur ondertussen gerust een aanvraag — we
                helpen je graag.
              </p>
              <Link
                href="/contact"
                className="mt-5 inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-medium text-white"
                style={{ background: accent }}
              >
                Contact opnemen
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/item/${item.id}`}
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
    </>
  );
}

function PriceLabel({
  item,
  accent,
}: {
  item: {
    pricePerHour: import("@prisma/client").Prisma.Decimal | null;
    pricePerDay: import("@prisma/client").Prisma.Decimal | null;
    pricePerWeek: import("@prisma/client").Prisma.Decimal | null;
  };
  accent: string;
}) {
  const candidates: { label: string; value: number | null }[] = [
    { label: "/ dag", value: item.pricePerDay ? Number(item.pricePerDay) : null },
    { label: "/ uur", value: item.pricePerHour ? Number(item.pricePerHour) : null },
    { label: "/ week", value: item.pricePerWeek ? Number(item.pricePerWeek) : null },
  ];
  const best = candidates.find((c) => c.value !== null);
  if (!best) {
    return <span className="text-xs text-muted-foreground">Op aanvraag</span>;
  }
  return (
    <span className="text-sm font-semibold tabular-nums" style={{ color: accent }}>
      vanaf € {best.value?.toFixed(2)}{" "}
      <span className="text-xs font-normal text-muted-foreground">{best.label}</span>
    </span>
  );
}
