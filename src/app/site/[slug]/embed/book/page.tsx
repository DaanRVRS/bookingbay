import { notFound } from "next/navigation";
import { getOrgBySlug, getTenantCatalog } from "@/lib/tenants/queries";
import { SmartBookingWidget } from "@/components/booking-widget/SmartBookingWidget";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ accent?: string }>;
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

export default async function EmbedBookPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { accent: accentParam } = await searchParams;
  const org = await getOrgBySlug(slug);
  if (!org) notFound();

  const categories = await getTenantCatalog(org.id);
  const buckets = buildBuckets(categories);
  const accent = normalizeAccent(accentParam, org.primaryColor ?? "#ef5934");

  return (
    <div className="px-4 py-6 sm:px-6">
      <SmartBookingWidget
        slug={slug}
        orgName={org.name}
        accent={accent}
        categories={buckets}
      />
    </div>
  );
}
