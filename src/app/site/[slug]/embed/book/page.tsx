import { notFound } from "next/navigation";
import { getOrgBySlug, getTenantCatalog, getTenantAddons } from "@/lib/tenants/queries";
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
    /** Hoofdcategorie + evt. subcategorie — voor add-on-matching. */
    categoryIds: string[];
    items: {
      id: string;
      name: string;
      description: string | null;
      imageUrl: string | null;
      imageUrls: string[];
      pricePerUnit: number | null;
      bookingIntervalMinutes: number;
      cleaningFee: number | null;
      captainFee: number | null;
      fuelFee: number | null;
    }[];
  }[] = [];
  for (const cat of categories) {
    if (cat.items.length > 0) {
      out.push({
        id: cat.id,
        name: cat.name,
        categoryIds: [cat.id],
        items: cat.items.map((i) => ({
          id: i.id,
          name: i.name,
          description: i.description,
          imageUrl: i.imageUrl,
          imageUrls: i.imageUrls ?? [],
          pricePerUnit: i.pricePerUnit ? Number(i.pricePerUnit) : null,
          bookingIntervalMinutes: i.bookingIntervalMinutes,
          cleaningFee: i.cleaningFee ? Number(i.cleaningFee) : null,
          captainFee: i.captainFee ? Number(i.captainFee) : null,
          fuelFee: i.fuelFee ? Number(i.fuelFee) : null,
        })),
      });
    }
    for (const sub of cat.children) {
      if (sub.items.length > 0) {
        out.push({
          id: sub.id,
          name: `${cat.name} · ${sub.name}`,
          categoryIds: [cat.id, sub.id],
          items: sub.items.map((i) => ({
            id: i.id,
            name: i.name,
            description: i.description,
            imageUrl: i.imageUrl,
          imageUrls: i.imageUrls ?? [],
            pricePerUnit: i.pricePerUnit ? Number(i.pricePerUnit) : null,
            bookingIntervalMinutes: i.bookingIntervalMinutes,
            cleaningFee: i.cleaningFee ? Number(i.cleaningFee) : null,
            captainFee: i.captainFee ? Number(i.captainFee) : null,
            fuelFee: i.fuelFee ? Number(i.fuelFee) : null,
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

  const [categories, addons] = await Promise.all([
    getTenantCatalog(org.id),
    getTenantAddons(org.id),
  ]);
  const buckets = buildBuckets(categories);
  const design = resolveWidgetDesign(org, sp);
  const { radius, shadow } = design;

  return (
    <div
      className="px-4 py-8 sm:px-6 sm:py-12"
      style={themeStyle(design.theme) as CSSProperties}
    >
      {/* Ingekaderd zoals de standalone-widget — niet full-width "mega". */}
      <div className="mx-auto max-w-2xl">
        <div
          className="border border-border bg-background p-6 sm:p-8"
          style={{
            borderRadius: `${radius}px`,
            boxShadow: shadow
              ? "0 8px 30px -12px rgba(0,0,0,0.10)"
              : undefined,
          }}
        >
          <SmartBookingWidget
            slug={slug}
            orgName={org.name}
            logoUrl={org.logoUrl}
            accent={design.accent}
            categories={buckets}
            addons={addons}
            usps={design.usps}
            tagline={design.tagline}
            defaultLocale={design.defaultLocale}
            initialItemId={sp.item ?? null}
          />
        </div>
      </div>
    </div>
  );
}
