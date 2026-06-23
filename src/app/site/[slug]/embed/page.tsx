import Link from "next/link";
import { ImageIcon, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { getOrgBySlug, getTenantCatalog, searchTenantItems } from "@/lib/tenants/queries";
import { unitLabel } from "@/lib/bookings/price";
import { TenantSearch } from "@/components/tenants/TenantSearch";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
}

export default async function EmbedHomePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { q = "" } = await searchParams;
  const org = await getOrgBySlug(slug);
  if (!org) notFound();

  const accent = org.primaryColor ?? "#ef5934";
  const trimmed = q.trim();

  let allItems: {
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
    allItems = matches.map((m) => ({
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
    allItems = categories.flatMap((c) => [
      ...c.items.map((i) => ({ ...i, categoryName: c.name })),
      ...c.children.flatMap((sub) =>
        sub.items.map((i) => ({ ...i, categoryName: `${c.name} · ${sub.name}` })),
      ),
    ]);
  }

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="mb-5">
        <TenantSearch basePath="/embed" accent={accent} initialQuery={q} />
      </div>

      {allItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {trimmed
              ? `Niets gevonden voor "${trimmed}".`
              : "Het aanbod wordt nog samengesteld."}
          </p>
          <Link
            href="/embed/contact"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-medium text-white"
            style={{ background: accent }}
          >
            Contact opnemen
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {allItems.map((item) => (
          <Link
            key={item.id}
            href={`/embed/item/${item.id}`}
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
            <div className="flex flex-1 flex-col gap-1.5 p-3.5">
              <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                {item.categoryName}
              </p>
              <h3 className="text-sm font-semibold tracking-tight">{item.name}</h3>
              <div className="mt-auto flex items-end justify-between pt-2">
                <PriceLabel item={item} accent={accent} />
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-medium transition-transform group-hover:translate-x-0.5"
                  style={{ color: accent }}
                >
                  Meer <ArrowRight className="size-3" />
                </span>
              </div>
            </div>
          </Link>
        ))}
        </div>
      )}
    </div>
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
    return <span className="text-[11px] text-muted-foreground">Op aanvraag</span>;
  }
  return (
    <span className="text-sm font-semibold tabular-nums" style={{ color: accent }}>
      € {value.toFixed(2)}
      <span className="text-[11px] font-normal text-muted-foreground">
        {" "}/ {unitLabel(item.bookingIntervalMinutes)}
      </span>
    </span>
  );
}
