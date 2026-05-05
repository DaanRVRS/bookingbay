import Link from "next/link";
import type { HeroBlock } from "@/lib/pages/blocks";

export function HeroBlockView({ block, accent }: { block: HeroBlock; accent: string }) {
  const align = block.alignment === "center" ? "items-center text-center" : "items-start";
  const hasBg = block.backgroundImageUrl.trim().length > 0;

  return (
    <section className="relative overflow-hidden border-b border-border">
      {hasBg ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.backgroundImageUrl}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 size-full object-cover"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-black/30 via-black/40 to-black/60"
          />
        </>
      ) : (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background: `linear-gradient(135deg, color-mix(in oklch, ${accent} 18%, transparent) 0%, transparent 60%)`,
          }}
        />
      )}
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className={`flex max-w-3xl flex-col gap-4 ${align} ${block.alignment === "center" ? "mx-auto" : ""}`}>
          {block.heading && (
            <h1
              className={`text-4xl font-semibold tracking-tight text-balance sm:text-5xl ${
                hasBg ? "text-white" : ""
              }`}
            >
              {block.heading}
            </h1>
          )}
          {block.subheading && (
            <p
              className={`max-w-2xl text-lg text-pretty ${
                hasBg ? "text-white/85" : "text-muted-foreground"
              }`}
            >
              {block.subheading}
            </p>
          )}
          {block.buttonText && block.buttonHref && (
            <div className="mt-4">
              <Link
                href={block.buttonHref}
                className="inline-flex h-12 items-center justify-center rounded-lg px-6 font-medium text-white shadow-sm transition-opacity hover:opacity-90"
                style={{ background: accent }}
              >
                {block.buttonText}
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
