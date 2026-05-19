import { notFound } from "next/navigation";
import { getOrgBySlug, getTenantCatalog } from "@/lib/tenants/queries";
import { SmartBookingWidget } from "@/components/booking-widget/SmartBookingWidget";
import { resolveWidgetDesign } from "@/lib/widget/design";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
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

export default async function EmbedBookPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const org = await getOrgBySlug(slug);
  if (!org) notFound();

  const categories = await getTenantCatalog(org.id);
  const buckets = buildBuckets(categories);
  const design = resolveWidgetDesign(org, sp);

  return (
    <div className="px-4 py-6 sm:px-6">
      <SmartBookingWidget
        slug={slug}
        orgName={org.name}
        logoUrl={org.logoUrl}
        accent={design.accent}
        categories={buckets}
        usps={design.usps}
        tagline={design.tagline}
        defaultLocale={design.defaultLocale}
      />
    </div>
  );
}
