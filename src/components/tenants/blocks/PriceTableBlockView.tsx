import { Check } from "lucide-react";
import Link from "next/link";
import type { PriceTableBlock } from "@/lib/pages/blocks";

export function PriceTableBlockView({
  block,
  accent,
}: {
  block: PriceTableBlock;
  accent: string;
}) {
  const cols = block.columns;
  const visibleTiers = block.tiers;
  return (
    <section className="border-b border-border bg-muted/20 py-14 sm:py-20">
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
            cols === 3 ? "lg:grid-cols-3" : "sm:grid-cols-2"
          }`}
        >
          {visibleTiers.map((tier, i) => (
            <div
              key={i}
              className={`relative flex flex-col rounded-2xl border bg-card p-6 ${
                tier.highlighted ? "shadow-lg" : "border-border"
              }`}
              style={
                tier.highlighted
                  ? {
                      borderColor: `color-mix(in oklch, ${accent} 50%, transparent)`,
                      boxShadow: `0 24px 60px -30px color-mix(in oklch, ${accent} 60%, transparent)`,
                    }
                  : undefined
              }
            >
              {tier.highlighted && (
                <span
                  className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 rounded-full px-3 py-1 text-xs font-medium text-white"
                  style={{ background: accent }}
                >
                  Aanbevolen
                </span>
              )}
              <h3 className="text-xl font-semibold tracking-tight">{tier.name}</h3>
              {tier.price && (
                <p className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tabular-nums">
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className="text-sm text-muted-foreground">
                      {tier.period}
                    </span>
                  )}
                </p>
              )}
              {tier.features.length > 0 && (
                <ul className="mt-5 space-y-2 text-sm">
                  {tier.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5">
                      <span
                        className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full"
                        style={{
                          background: `color-mix(in oklch, ${accent} 18%, transparent)`,
                          color: accent,
                        }}
                      >
                        <Check className="size-3" />
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}
              {tier.buttonText && (
                <Link
                  href={tier.buttonHref || "#"}
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-medium transition-opacity hover:opacity-90"
                  style={
                    tier.highlighted
                      ? { background: accent, color: "white" }
                      : { borderColor: "var(--border)", border: "1px solid", background: "var(--background)" }
                  }
                >
                  {tier.buttonText}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
