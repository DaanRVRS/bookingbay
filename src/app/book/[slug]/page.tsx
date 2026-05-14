import { notFound } from "next/navigation";
import { getOrgBySlug, getTenantCatalog } from "@/lib/tenants/queries";
import { PublicBookingForm } from "@/components/booking-widget/PublicBookingForm";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) return { title: "Niet gevonden" };
  return { title: `Boek bij ${org.name}` };
}

export default async function BookPage({ params }: PageProps) {
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
          Boek bij {org.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kies wat je wil boeken en wanneer.
        </p>

        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          <PublicBookingForm
            slug={slug}
            orgName={org.name}
            accent={accent}
            itemOptions={itemOptions}
          />
        </div>
      </div>
    </main>
  );
}
