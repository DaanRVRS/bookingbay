import Link from "next/link";
import { ArrowRight, ImageIcon } from "lucide-react";
import { db } from "@/lib/db";
import type { SliderBlock } from "@/lib/pages/blocks";

type CardItem = {
  href: string;
  title: string;
  imageUrl: string | null;
  subtitle?: string | null;
};

async function loadCards(
  organizationId: string,
  block: SliderBlock,
): Promise<CardItem[]> {
  if (block.source === "categories") {
    const where = block.categoryId
      ? { organizationId, parentId: block.categoryId }
      : { organizationId, parentId: null };
    const cats = await db.category.findMany({
      where,
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, description: true, imageUrl: true },
    });
    return cats.map((c) => ({
      href: `/#aanbod`,
      title: c.name,
      imageUrl: c.imageUrl,
      subtitle: c.description,
    }));
  }
  // items
  const items = await db.item.findMany({
    where: {
      organizationId,
      isActive: true,
      isAddon: false,
      ...(block.categoryId ? { categoryId: block.categoryId } : {}),
    },
    orderBy: { name: "asc" },
    take: 12,
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      pricePerDay: true,
      pricePerHour: true,
    },
  });
  return items.map((i) => {
    const price = i.pricePerDay ? `€ ${Number(i.pricePerDay).toFixed(2)} / dag` : null;
    return {
      href: `/item/${i.id}`,
      title: i.name,
      imageUrl: i.imageUrl,
      subtitle: price,
    };
  });
}

export async function SliderBlockView({
  block,
  organizationId,
  accent,
}: {
  block: SliderBlock;
  organizationId: string;
  accent: string;
}) {
  const cards = await loadCards(organizationId, block);
  if (cards.length === 0) return null;

  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {block.title && (
          <h2 className="mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">
            {block.title}
          </h2>
        )}
        <div className="-mx-4 overflow-x-auto pb-2 sm:mx-0">
          <ul className="flex gap-4 px-4 sm:px-0">
            {cards.map((card, i) => (
              <li key={i} className="w-64 shrink-0">
                <Link
                  href={card.href}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {card.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={card.imageUrl}
                        alt={card.title}
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="grid size-full place-items-center text-muted-foreground">
                        <ImageIcon className="size-8 opacity-40" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <p className="truncate text-sm font-semibold tracking-tight">
                      {card.title}
                    </p>
                    {card.subtitle && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {card.subtitle}
                      </p>
                    )}
                    <span
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium"
                      style={{ color: accent }}
                    >
                      Bekijken <ArrowRight className="size-3" />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
