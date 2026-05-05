import type { FaqBlock } from "@/lib/pages/blocks";

export function FaqBlockView({ block, accent }: { block: FaqBlock; accent: string }) {
  const items = block.items.filter((i) => i.question.trim());
  if (items.length === 0 && !block.heading && !block.intro) return null;

  return (
    <section className="border-t border-border py-12 sm:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {block.heading && (
          <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {block.heading}
          </h2>
        )}
        {block.intro && (
          <p className="mt-3 text-base leading-relaxed text-muted-foreground text-pretty">
            {block.intro}
          </p>
        )}
        {items.length > 0 && (
          <div className="mt-7 divide-y divide-border rounded-2xl border border-border bg-card">
            {items.map((item, i) => (
              <details key={i} className="group [&>summary]:cursor-pointer">
                <summary className="flex items-center justify-between gap-4 px-5 py-4 text-base font-medium [&::-webkit-details-marker]:hidden">
                  <span>{item.question}</span>
                  <span
                    aria-hidden
                    className="grid size-7 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <div
                  className="px-5 pb-4 text-sm leading-relaxed whitespace-pre-line text-foreground/85"
                  style={{
                    borderLeft: `3px solid ${accent}`,
                    marginLeft: "1.25rem",
                    paddingLeft: "0.75rem",
                  }}
                >
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
