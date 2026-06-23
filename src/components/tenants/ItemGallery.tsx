"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";

/**
 * Galerij voor de item-detailpagina: grote hoofd-afbeelding met klikbare
 * thumbnails eronder. Bij één afbeelding wordt alleen de hoofd-afbeelding
 * getoond; bij geen afbeeldingen een placeholder.
 */
export function ItemGallery({ images, alt }: { images: string[]; alt: string }) {
  const list = images.filter(Boolean);
  const [active, setActive] = useState(0);

  if (list.length === 0) {
    return (
      <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-xl border border-border bg-muted text-muted-foreground">
        <ImageIcon className="size-12 opacity-40" />
      </div>
    );
  }

  const current = list[Math.min(active, list.length - 1)];

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current} alt={alt} className="size-full object-cover" />
      </div>
      {list.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {list.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Afbeelding ${i + 1}`}
              aria-current={i === active}
              className={`aspect-[4/3] overflow-hidden rounded-lg border transition-colors ${
                i === active
                  ? "border-foreground ring-1 ring-foreground"
                  : "border-border hover:border-foreground/40"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
