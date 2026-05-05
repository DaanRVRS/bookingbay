import { ImageIcon } from "lucide-react";
import type { ImageStripBlock } from "@/lib/pages/blocks";

export function ImageStripBlockView({ block }: { block: ImageStripBlock }) {
  if (block.images.length === 0) return null;
  const cols =
    block.images.length === 1
      ? "grid-cols-1"
      : block.images.length === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-1 sm:grid-cols-3";

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className={`grid gap-4 ${cols}`}>
          {block.images.map((img, i) => (
            <div
              key={i}
              className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted"
            >
              {img.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={img.url}
                  alt={img.alt}
                  className="size-full object-cover"
                />
              ) : (
                <div className="grid size-full place-items-center text-muted-foreground">
                  <ImageIcon className="size-8 opacity-40" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
