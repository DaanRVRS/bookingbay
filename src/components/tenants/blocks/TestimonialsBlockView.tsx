import { Quote, Star } from "lucide-react";
import type { TestimonialsBlock } from "@/lib/pages/blocks";

export function TestimonialsBlockView({
  block,
  accent,
}: {
  block: TestimonialsBlock;
  accent: string;
}) {
  const cols = block.items.length === 1 ? 1 : block.items.length === 2 ? 2 : 3;
  return (
    <section className="border-b border-border py-14 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {(block.heading || block.intro) && (
          <div className="mx-auto max-w-2xl text-center">
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
        <div
          className={`mt-10 grid gap-5 ${
            cols >= 3 ? "lg:grid-cols-3 sm:grid-cols-2" : cols === 2 ? "sm:grid-cols-2" : ""
          }`}
        >
          {block.items.map((t, i) => (
            <figure
              key={i}
              className="relative flex flex-col rounded-2xl border border-border bg-card p-6"
            >
              <Quote
                aria-hidden
                className="absolute right-4 top-4 size-8 opacity-10"
                style={{ color: accent }}
              />
              {t.rating > 0 && (
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className="size-4"
                      style={{
                        color: idx < t.rating ? accent : "color-mix(in oklch, var(--muted-foreground) 30%, transparent)",
                        fill: idx < t.rating ? accent : "transparent",
                      }}
                    />
                  ))}
                </div>
              )}
              <blockquote className="mt-4 text-sm leading-relaxed text-foreground/90">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              {(t.author || t.role) && (
                <figcaption className="mt-5 text-xs">
                  {t.author && (
                    <span className="font-semibold text-foreground">{t.author}</span>
                  )}
                  {t.author && t.role && (
                    <span className="text-muted-foreground"> · </span>
                  )}
                  {t.role && (
                    <span className="text-muted-foreground">{t.role}</span>
                  )}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
