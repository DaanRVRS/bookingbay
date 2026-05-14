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
    <main className="min-h-dvh bg-muted/30">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <header className="flex items-center gap-3 pb-6">
          {org.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={org.logoUrl}
              alt={org.name}
              width={40}
              height={40}
              className="size-10 rounded-md object-cover"
            />
          ) : (
            <div
              className="grid size-10 place-items-center rounded-md text-sm font-semibold text-white"
              style={{ background: accent }}
            >
              {org.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Boeking via</p>
            <p className="text-sm font-semibold tracking-tight">{org.name}</p>
          </div>
        </header>

        <div className="rounded-xl border border-border bg-card p-6">
          <SmartBookingWidget
            slug={slug}
            orgName={org.name}
            accent={accent}
            categories={buckets}
          />
        </div>
      </div>
    </main>
  );
}
