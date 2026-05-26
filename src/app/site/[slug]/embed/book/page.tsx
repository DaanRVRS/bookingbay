import { notFound } from "next/navigation";
import { getOrgBySlug, getTenantCatalog } from "@/lib/tenants/queries";
import type { CSSProperties } from "react";
import { SmartBookingWidget } from "@/components/booking-widget/SmartBookingWidget";
import { resolveWidgetDesign } from "@/lib/widget/design";
import { themeStyle } from "@/lib/widget/theme";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

// Server-side route-cache van 60s — zelfde reden als /book/[slug].
// revalidatePath wordt aangeroepen door widget-/site-actions bij
// wijzigingen, dus klanten zien updates vrijwel direct.
export const revalidate = 60;

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
      cleaningFee: number | null;
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
          cleaningFee: i.cleaningFee ? Number(i.cleaningFee) : null,
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
            cleaningFee: i.cleaningFee ? Number(i.cleaningFee) : null,
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
    <div
      className="bg-background px-4 py-6 sm:px-6"
      style={themeStyle(design.theme) as CSSProperties}
    >
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
