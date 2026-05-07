import { Quote } from "lucide-react";
import type { QuoteBlock } from "@/lib/pages/blocks";

export function QuoteBlockView({
  block,
  accent,
}: {
  block: QuoteBlock;
  accent: string;
}) {
  if (!block.quote) return null;
  const alignClass = block.align === "center" ? "text-center" : "text-left";
  return (
    <section className="border-b border-border py-14 sm:py-20">
      <div
        className={`mx-auto max-w-3xl px-4 sm:px-6 ${alignClass}`}
      >
        <Quote
          className={`size-10 opacity-30 ${block.align === "center" ? "mx-auto" : ""}`}
          style={{ color: accent }}
          aria-hidden
        />
        <blockquote className="mt-4 text-2xl font-semibold leading-snug tracking-tight text-balance sm:text-3xl">
          &ldquo;{block.quote}&rdquo;
        </blockquote>
        {(block.author || block.role) && (
          <p className="mt-5 text-sm">
            {block.author && (
              <span className="font-semibold text-foreground">{block.author}</span>
            )}
            {block.author && block.role && (
              <span className="text-muted-foreground"> · </span>
            )}
            {block.role && (
              <span className="text-muted-foreground">{block.role}</span>
            )}
          </p>
        )}
      </div>
    </section>
  );
}
