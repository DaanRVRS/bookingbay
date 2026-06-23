import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { getOrgBySlug, getTenantItem } from "@/lib/tenants/queries";
import { unitLabel } from "@/lib/bookings/price";
import { getTenantBasePath, tenantHref } from "@/lib/tenants/base-path";

interface PageProps {
  params: Promise<{ slug: string; itemId: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug, itemId } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) return {};
  const item = await getTenantItem(org.id, itemId);
  if (!item) return {};
  return { title: item.name };
}

export default async function ItemDetailPage({ params }: PageProps) {
  const { slug, itemId } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) notFound();
  const item = await getTenantItem(org.id, itemId);
  if (!item) notFound();

  const accent = org.primaryColor ?? "#ef5934";
  const base = await getTenantBasePath(slug);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href={tenantHref(base, "/")}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Terug naar aanbod
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-[1.1fr_1fr]">
        <div className="aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt={item.name} className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center text-muted-foreground">
              <ImageIcon className="size-12 opacity-40" />
            </div>
          )}
        </div>

        <div>
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {item.category.name}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            {item.name}
          </h1>

          {item.description && (
            <p className="mt-4 leading-relaxed whitespace-pre-line text-foreground/90">
              {item.description}
            </p>
          )}

          <div className="mt-7 grid grid-cols-2 gap-3 rounded-xl border border-border bg-card p-4">
            <PriceTile
              label={`Prijs per ${unitLabel(item.bookingIntervalMinutes)}`}
              value={item.pricePerUnit ? Number(item.pricePerUnit) : null}
              accent={accent}
            />
            <PriceTile label="Borg" value={item.deposit ? Number(item.deposit) : null} accent={accent} />
          </div>

          <Link
            href={tenantHref(base, `/embed/book?item=${item.id}`)}
            className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-lg px-6 font-medium text-white shadow-sm transition-opacity hover:opacity-90 sm:w-auto"
            style={{ background: accent }}
          >
            Reserveer
          </Link>
          <p className="mt-2 text-xs text-muted-foreground">
            Kies direct je datum en tijd.
          </p>
        </div>
      </div>
    </div>
  );
}

function PriceTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | null;
  accent: string;
}) {
  return (
    <div className="rounded-md bg-muted/40 p-3">
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p
        className="mt-1 text-base font-semibold tabular-nums"
        style={value ? { color: accent } : undefined}
      >
        {value ? `€ ${value.toFixed(2)}` : "—"}
      </p>
    </div>
  );
}
