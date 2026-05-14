import { notFound } from "next/navigation";
import { getOrgBySlug, getTenantItem } from "@/lib/tenants/queries";
import { PublicBookingForm } from "@/components/booking-widget/PublicBookingForm";

interface PageProps {
  params: Promise<{ slug: string; itemId: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug, itemId } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) return { title: "Niet gevonden" };
  const item = await getTenantItem(org.id, itemId);
  return {
    title: item ? `Boek ${item.name} — ${org.name}` : `Boek bij ${org.name}`,
  };
}

export default async function BookItemPage({ params }: PageProps) {
  const { slug, itemId } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) notFound();
  const item = await getTenantItem(org.id, itemId);
  if (!item) notFound();

  const accent = org.primaryColor ?? "#ef5934";

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

        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Boek {item.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vul je gegevens in en {org.name} bevestigt je boeking per e-mail.
        </p>

        <div className="mt-6 rounded-xl border border-border bg-card p-6">
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
    </main>
  );
}
