import Link from "next/link";
import type { CtaBlock } from "@/lib/pages/blocks";

export function CtaBlockView({ block, accent }: { block: CtaBlock; accent: string }) {
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div
          className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-10 text-center sm:px-12"
          style={{
            background: `linear-gradient(135deg, color-mix(in oklch, ${accent} 8%, var(--card)) 0%, var(--card) 70%)`,
          }}
        >
          {block.heading && (
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{block.heading}</h2>
          )}
          {block.subheading && (
            <p className="max-w-xl text-base text-muted-foreground">{block.subheading}</p>
          )}
          {block.buttonText && block.buttonHref && (
            <Link
              href={block.buttonHref}
              className="mt-2 inline-flex h-12 items-center justify-center rounded-lg px-6 font-medium text-white shadow-sm transition-opacity hover:opacity-90"
              style={{ background: accent }}
            >
              {block.buttonText}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
