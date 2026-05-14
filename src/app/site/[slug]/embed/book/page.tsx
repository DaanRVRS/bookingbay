import { notFound } from "next/navigation";
import { getOrgBySlug, getTenantCatalog } from "@/lib/tenants/queries";
import { PublicBookingForm } from "@/components/booking-widget/PublicBookingForm";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function EmbedBookGeneralPage({ params }: PageProps) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) notFound();

  const categories = await getTenantCatalog(org.id);
  const itemOptions = categories.flatMap((c) => [
    ...c.items.map((i) => ({
      id: i.id,
      name: i.name,
      pricePerHour: i.pricePerHour ? Number(i.pricePerHour) : null,
      pricePerDay: i.pricePerDay ? Number(i.pricePerDay) : null,
    })),
    ...c.children.flatMap((sub) =>
      sub.items.map((i) => ({
        id: i.id,
        name: i.name,
        pricePerHour: i.pricePerHour ? Number(i.pricePerHour) : null,
        pricePerDay: i.pricePerDay ? Number(i.pricePerDay) : null,
      })),
    ),
  ]);

  const accent = org.primaryColor ?? "#ef5934";

  return (
    <div className="px-4 py-6 sm:px-6">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
        Boek bij {org.name}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Kies wat je wil boeken en wanneer.
      </p>

      <div className="mt-5 rounded-xl border border-border bg-card p-5">
        <PublicBookingForm
          slug={slug}
          orgName={org.name}
          accent={accent}
          itemOptions={itemOptions}
        />
      </div>
    </div>
  );
}
