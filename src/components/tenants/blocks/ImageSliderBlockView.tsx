"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { ImageSliderBlock } from "@/lib/pages/blocks";

const ASPECT_CLASS: Record<ImageSliderBlock["aspect"], string> = {
  wide: "aspect-[16/9]",
  square: "aspect-square",
  tall: "aspect-[3/4]",
};

export function ImageSliderBlockView({ block }: { block: ImageSliderBlock }) {
  const slides = block.slides;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (block.intervalMs === 0 || slides.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, block.intervalMs);
    return () => clearInterval(id);
  }, [block.intervalMs, slides.length]);

  if (slides.length === 0) {
    return (
      <section className="border-b border-border py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center text-sm text-muted-foreground">
            Voeg slides toe in de instellingen.
          </div>
        </div>
      </section>
    );
  }

  const next = () => setIndex((i) => (i + 1) % slides.length);
  const prev = () => setIndex((i) => (i - 1 + slides.length) % slides.length);

  return (
    <section className="border-b border-border py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {block.heading && (
          <h2 className="mb-6 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {block.heading}
          </h2>
        )}
        <div
          className={`relative overflow-hidden rounded-2xl border border-border bg-muted ${ASPECT_CLASS[block.aspect]}`}
        >
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
              className="absolute inset-0"
            >
              {slides[index].url ? (
                slides[index].link ? (
                  <Link href={slides[index].link} className="block size-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slides[index].url}
                      alt={slides[index].caption || ""}
                      className="size-full object-cover"
                    />
                  </Link>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={slides[index].url}
                    alt={slides[index].caption || ""}
                    className="size-full object-cover"
                  />
                )
              ) : (
                <div className="grid size-full place-items-center text-muted-foreground">
                  <ImageIcon className="size-12 opacity-40" />
                </div>
              )}
              {slides[index].caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent p-4 text-sm text-white sm:p-6">
                  {slides[index].caption}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {slides.length > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Vorige"
                className="absolute left-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-foreground backdrop-blur transition-colors hover:bg-white"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Volgende"
                className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-foreground backdrop-blur transition-colors hover:bg-white"
              >
                <ChevronRight className="size-4" />
              </button>
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Slide ${i + 1}`}
                    className={`size-2 rounded-full transition-all ${
                      i === index ? "w-6 bg-white" : "bg-white/50 hover:bg-white/70"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
