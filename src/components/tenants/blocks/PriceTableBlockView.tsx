import { ImageIcon } from "lucide-react";
import Link from "next/link";
import type { PriceTableBlock } from "@/lib/pages/blocks";
import { unitLabel } from "@/lib/bookings/price";

export interface PriceTableItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  pricePerUnit: number | null;
  bookingIntervalMinutes: number;
  deposit: number | null;
  categoryName: string;
}

function formatPrice(v: number | null) {
  if (v === null || Number.isNaN(v)) return "—";
  return `€${v.toFixed(2).replace(".", ",")}`;
}

/** "€12,50 / uur" — prijs met de eenheid van dit item. */
function formatUnitPrice(it: PriceTableItem) {
  if (it.pricePerUnit === null || Number.isNaN(it.pricePerUnit)) return "—";
  return `${formatPrice(it.pricePerUnit)} / ${unitLabel(it.bookingIntervalMinutes)}`;
}

export function PriceTableBlockView({
  block,
  accent,
  resolvedItems,
  contactBasePath,
}: {
  block: PriceTableBlock;
  accent: string;
  resolvedItems?: PriceTableItem[];
  /** Tenant base path for the "Reserveer" CTA link (e.g. "" or "/site/<slug>"). */
  contactBasePath?: string;
}) {
  const items = resolvedItems ?? [];
  // Eén prijs per item nu: de drie oude tarief-kolommen vouwen samen tot één
  // "Prijs"-kolom (zichtbaar als de tenant minstens één tarief aan had staan).
  const showCols = {
    price: block.showHour || block.showDay || block.showWeek,
    deposit: block.showDeposit,
  };
  const hasAnyCol = showCols.price || showCols.deposit;

  return (
    <section className="border-b border-border py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {(block.heading || block.intro) && (
          <div className="mb-8 max-w-2xl">
            {block.heading && (
              <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                {block.heading}
              </h2>
            )}
            {block.intro && (
              <p className="mt-3 text-base text-muted-foreground text-pretty">
                {block.intro}
              </p>
            )}
          </div>
        )}

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center text-sm text-muted-foreground">
            Nog geen items om te tonen. Voeg ze toe in je catalogus.
          </div>
        ) : block.layout === "cards" ? (
          <CardsLayout
            items={items}
            showCols={showCols}
            block={block}
            accent={accent}
            contactBasePath={contactBasePath ?? ""}
          />
        ) : (
          <TableLayout
            items={items}
            showCols={showCols}
            hasAnyCol={hasAnyCol}
            block={block}
            accent={accent}
            contactBasePath={contactBasePath ?? ""}
          />
        )}
      </div>
    </section>
  );
}

interface ColFlags {
  price: boolean;
  deposit: boolean;
}

function TableLayout({
  items,
  showCols,
  hasAnyCol,
  block,
  accent,
  contactBasePath,
}: {
  items: PriceTableItem[];
  showCols: ColFlags;
  hasAnyCol: boolean;
  block: PriceTableBlock;
  accent: string;
  contactBasePath: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[600px] text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Item</th>
            {showCols.price && (
              <th className="px-4 py-3 text-right font-semibold">Prijs</th>
            )}
            {showCols.deposit && (
              <th className="px-4 py-3 text-right font-semibold">Borg</th>
            )}
            {block.showCta && hasAnyCol && (
              <th className="px-4 py-3 text-right font-semibold" aria-label="Actie" />
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((it) => (
            <tr key={it.id} className="hover:bg-muted/20">
              <td className="px-4 py-3">
                <Link
                  href={
                    contactBasePath
                      ? `${contactBasePath}/item/${it.id}`
                      : `/item/${it.id}`
                  }
                  className="flex items-center gap-3 hover:underline"
                >
                  {it.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.imageUrl}
                      alt={it.name}
                      className="hidden size-10 shrink-0 rounded-md object-cover sm:block"
                    />
                  ) : (
                    <div className="hidden size-10 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground sm:grid">
                      <ImageIcon className="size-4 opacity-40" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{it.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {it.categoryName}
                    </p>
                  </div>
                </Link>
              </td>
              {showCols.price && (
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatUnitPrice(it)}
                </td>
              )}
              {showCols.deposit && (
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {formatPrice(it.deposit)}
                </td>
              )}
              {block.showCta && hasAnyCol && (
                <td className="px-4 py-3 text-right">
                  <Link
                    href={
                      contactBasePath
                        ? `${contactBasePath}/embed/book?item=${it.id}`
                        : `/embed/book?item=${it.id}`
                    }
                    className="inline-flex h-8 items-center rounded-md px-3 text-xs font-medium text-white shadow-sm hover:opacity-90"
                    style={{ background: accent }}
                  >
                    {block.ctaLabel || "Reserveer"}
                  </Link>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CardsLayout({
  items,
  showCols,
  block,
  accent,
  contactBasePath,
}: {
  items: PriceTableItem[];
  showCols: ColFlags;
  block: PriceTableBlock;
  accent: string;
  contactBasePath: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => {
        const itemHref = contactBasePath
          ? `${contactBasePath}/item/${it.id}`
          : `/item/${it.id}`;
        const reserveHref = contactBasePath
          ? `${contactBasePath}/embed/book?item=${it.id}`
          : `/embed/book?item=${it.id}`;
        return (
          <div
            key={it.id}
            className="flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
          >
            <Link href={itemHref}>
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                {it.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={it.imageUrl}
                    alt={it.name}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="grid size-full place-items-center text-muted-foreground">
                    <ImageIcon className="size-8 opacity-40" />
                  </div>
                )}
              </div>
            </Link>
            <div className="flex flex-1 flex-col gap-3 p-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {it.categoryName}
                </p>
                <Link href={itemHref} className="hover:underline">
                  <h3 className="mt-0.5 text-base font-semibold tracking-tight">
                    {it.name}
                  </h3>
                </Link>
              </div>
              <dl className="grid grid-cols-2 gap-2 rounded-lg bg-muted/30 p-2 text-xs">
                {showCols.price && (
                  <PriceCell
                    label="Prijs"
                    value={formatUnitPrice(it)}
                    accent={accent}
                  />
                )}
                {showCols.deposit && (
                  <PriceCell
                    label="Borg"
                    value={formatPrice(it.deposit)}
                    muted
                  />
                )}
              </dl>
              {block.showCta && (
                <Link
                  href={reserveHref}
                  className="mt-auto inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-medium text-white shadow-sm hover:opacity-90"
                  style={{ background: accent }}
                >
                  {block.ctaLabel || "Reserveer"}
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PriceCell({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: string;
  accent?: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded bg-background px-2 py-1.5">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`mt-0.5 text-sm font-semibold tabular-nums ${muted ? "text-muted-foreground" : ""}`}
        style={muted ? undefined : { color: accent }}
      >
        {value}
      </dd>
    </div>
  );
}
