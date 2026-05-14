import { notFound } from "next/navigation";
import { getOrgBySlug, getTenantItem } from "@/lib/tenants/queries";
import { PublicBookingForm } from "@/components/booking-widget/PublicBookingForm";

interface PageProps {
  params: Promise<{ slug: string; itemId: string }>;
}

export default async function EmbedBookItemPage({ params }: PageProps) {
  const { slug, itemId } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) notFound();
  const item = await getTenantItem(org.id, itemId);
  if (!item) notFound();

  const accent = org.primaryColor ?? "#ef5934";

  return (
    <div className="px-4 py-6 sm:px-6">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
        Boek {item.name}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Vul je gegevens in en {org.name} bevestigt je boeking.
      </p>

      <div className="mt-5 rounded-xl border border-border bg-card p-5">
        <PublicBookingForm
          slug={slug}
          orgName={org.name}
          accent={accent}
          fixedItem={{
            id: item.id,
            name: item.name,
            pricePerHour: item.pricePerHour ? Number(item.pricePerHour) : null,
            pricePerDay: item.pricePerDay ? Number(item.pricePerDay) : null,
          }}
        />
      </div>
    </div>
  );
}
