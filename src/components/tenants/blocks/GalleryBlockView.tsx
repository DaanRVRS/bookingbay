import type { GalleryBlock } from "@/lib/pages/blocks";

const colsMap: Record<2 | 3 | 4, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

export function GalleryBlockView({ block }: { block: GalleryBlock }) {
  const images = block.images.filter((i) => i.url);
  if (images.length === 0) return null;

  return (
    <section className="border-t border-border py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {block.heading && (
          <h2 className="mb-6 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {block.heading}
          </h2>
        )}
        <div className={`grid grid-cols-1 gap-3 ${colsMap[block.columns]}`}>
          {images.map((img, i) => (
            <figure
              key={i}
              className="group overflow-hidden rounded-xl border border-border bg-card"
            >
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.caption || ""}
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </div>
              {img.caption && (
                <figcaption className="px-3 py-2 text-xs text-muted-foreground">
                  {img.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
