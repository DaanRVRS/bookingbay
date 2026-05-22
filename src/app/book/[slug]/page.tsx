import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { getOrgBySlug, getTenantCatalog } from "@/lib/tenants/queries";
import { SmartBookingWidget } from "@/components/booking-widget/SmartBookingWidget";
import { resolveWidgetDesign } from "@/lib/widget/design";
import { themeStyle } from "@/lib/widget/theme";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

// Server-side route-cache van 60s. Browser blijft no-store krijgen
// (next.config.ts) voor deploy-versheid, maar Next zelf hoeft niet
// elke request de hele org + catalogus + theme opnieuw te bouwen.
// revalidatePath("/book/<slug>") in widget/site-actions reset 'm
// meteen bij een wijziging.
export const revalidate = 60;

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

export default async function BookPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const org = await getOrgBySlug(slug);
  if (!org) notFound();

  const categories = await getTenantCatalog(org.id);
  const buckets = buildBuckets(categories);
  const design = resolveWidgetDesign(org, sp);
  const { accent, radius, shadow } = design;

  return (
    <main
      className="relative min-h-dvh"
      style={themeStyle(design.theme) as CSSProperties}
    >
      {/* Accent achtergrond — gradient bovenin */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${accent}25 0%, transparent 65%)`,
        }}
      />

      <div className="relative mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        {/* bg-background = Widget-achtergrond token (kleur van het paneel
            zelf); inner kaarten gebruiken bg-card = Kaarten token. */}
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
            accent={accent}
            categories={buckets}
            usps={design.usps}
            tagline={design.tagline}
            defaultLocale={design.defaultLocale}
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
