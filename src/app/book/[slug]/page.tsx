import { notFound } from "next/navigation";
import { getOrgBySlug, getTenantCatalog } from "@/lib/tenants/queries";
import { SmartBookingWidget } from "@/components/booking-widget/SmartBookingWidget";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ accent?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) return { title: "Niet gevonden" };
  return { title: `Boek bij ${org.name}` };
}

function buildBuckets(
  categories: Awaited<ReturnType<typeof getTenantCatalog>>,
) {
  const out: {
    id: string;
    name: string;
    items: {
      id: string;
      name: string;
      description: string | null;
      imageUrl: string | null;
      pricePerHour: number | null;
      pricePerDay: number | null;
    }[];
  }[] = [];
  for (const cat of categories) {
    if (cat.items.length > 0) {
      out.push({
        id: cat.id,
        name: cat.name,
        items: cat.items.map((i) => ({
          id: i.id,
          name: i.name,
          description: i.description,
          imageUrl: i.imageUrl,
          pricePerHour: i.pricePerHour ? Number(i.pricePerHour) : null,
          pricePerDay: i.pricePerDay ? Number(i.pricePerDay) : null,
        })),
      });
    }
    for (const sub of cat.children) {
      if (sub.items.length > 0) {
        out.push({
          id: sub.id,
          name: `${cat.name} · ${sub.name}`,
          items: sub.items.map((i) => ({
            id: i.id,
            name: i.name,
            description: i.description,
            imageUrl: i.imageUrl,
            pricePerHour: i.pricePerHour ? Number(i.pricePerHour) : null,
            pricePerDay: i.pricePerDay ? Number(i.pricePerDay) : null,
          })),
        });
      }
    }
  }
  return out;
}

function normalizeAccent(input: string | undefined, fallback: string): string {
  if (!input) return fallback;
  const cleaned = input.replace(/^#/, "").trim();
  if (/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(cleaned)) return `#${cleaned}`;
  return fallback;
}

export default async function BookPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { accent: accentParam } = await searchParams;
  const org = await getOrgBySlug(slug);
  if (!org) notFound();

  const categories = await getTenantCatalog(org.id);
  const buckets = buildBuckets(categories);
  const accent = normalizeAccent(accentParam, org.primaryColor ?? "#ef5934");

  return (
    <main className="relative min-h-dvh">
      {/* Accent achtergrond — gradient bovenin */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${accent}25 0%, transparent 65%)`,
        }}
      />

      <div className="relative mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="flex items-center gap-3">
          {org.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={org.logoUrl}
              alt={org.name}
              width={44}
              height={44}
              className="size-11 rounded-xl object-cover shadow-sm ring-1 ring-border"
            />
          ) : (
            <div
              className="grid size-11 place-items-center rounded-xl text-base font-bold text-white shadow-sm"
              style={{
                background: accent,
                boxShadow: `0 4px 14px -4px ${accent}80`,
              }}
            >
              {org.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
              Boek bij
            </p>
            <p className="text-sm font-bold tracking-tight">{org.name}</p>
          </div>
        </header>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.10)] sm:p-8">
          <SmartBookingWidget
            slug={slug}
            orgName={org.name}
            accent={accent}
            categories={buckets}
          />
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Powered by{" "}
          <a
            href="https://www.bookingbay.nl"
            className="font-medium hover:text-foreground"
          >
            BookingBay
          </a>
        </p>
      </div>
    </main>
  );
}
