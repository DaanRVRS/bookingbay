import type { TextBlock } from "@/lib/pages/blocks";

export function TextBlockView({ block }: { block: TextBlock }) {
  const align =
    block.alignment === "center"
      ? "text-center"
      : block.alignment === "right"
        ? "text-right"
        : "text-left";

  return (
    <section className="py-10 sm:py-14">
      <div className={`mx-auto max-w-3xl px-4 sm:px-6 ${align}`}>
        {block.heading && (
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{block.heading}</h2>
        )}
        {block.body && (
          <p
            className={`text-base leading-relaxed whitespace-pre-line text-foreground/90 ${
              block.heading ? "mt-4" : ""
            }`}
          >
            {block.body}
          </p>
        )}
      </div>
    </section>
  );
}
