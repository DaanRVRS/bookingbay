import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { getOrgBySlug, getTenantItem } from "@/lib/tenants/queries";

interface PageProps {
  params: Promise<{ slug: string; itemId: string }>;
}

export default async function EmbedItemPage({ params }: PageProps) {
  const { slug, itemId } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) notFound();
  const item = await getTenantItem(org.id, itemId);
  if (!item) notFound();

  const accent = org.primaryColor ?? "#ef5934";

  return (
    <div className="px-4 py-6 sm:px-6">
      <Link
        href="/embed"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        ← Terug naar aanbod
      </Link>

      <div className="mt-4 grid gap-5 md:grid-cols-[1fr_1fr]">
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
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{item.name}</h1>

          {item.description && (
            <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-foreground/90">
              {item.description}
            </p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg border border-border bg-card p-3 sm:grid-cols-4">
            <PriceTile label="Per uur" value={item.pricePerHour ? Number(item.pricePerHour) : null} accent={accent} />
            <PriceTile label="Per dag" value={item.pricePerDay ? Number(item.pricePerDay) : null} accent={accent} />
            <PriceTile label="Per week" value={item.pricePerWeek ? Number(item.pricePerWeek) : null} accent={accent} />
            <PriceTile label="Borg" value={item.deposit ? Number(item.deposit) : null} accent={accent} />
          </div>

          <Link
            href={`/embed/contact?item=${item.id}`}
            className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg px-6 font-medium text-white shadow-sm transition-opacity hover:opacity-90 sm:w-auto"
            style={{ background: accent }}
          >
            Aanvragen
          </Link>
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
    <div className="rounded-md bg-muted/40 p-2.5">
      <p className="text-[9px] font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p
        className="mt-0.5 text-sm font-semibold tabular-nums"
        style={value ? { color: accent } : undefined}
      >
        {value ? `€ ${value.toFixed(2)}` : "—"}
      </p>
    </div>
  );
}
