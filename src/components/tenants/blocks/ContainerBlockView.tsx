import type { ContainerBlock } from "@/lib/pages/blocks";

const PAD: Record<ContainerBlock["padding"], string> = {
  sm: "py-8 sm:py-12 px-4 sm:px-6",
  md: "py-14 sm:py-20 px-4 sm:px-6",
  lg: "py-20 sm:py-32 px-4 sm:px-6",
};

const MAX_W: Record<ContainerBlock["maxWidth"], string> = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-6xl",
  full: "max-w-none",
};

const LAYOUT: Record<ContainerBlock["layout"], string> = {
  stack: "flex flex-col gap-6",
  "row-2": "grid gap-6 sm:grid-cols-2",
  "row-3": "grid gap-6 sm:grid-cols-2 lg:grid-cols-3",
};

const BG_CLASS: Record<ContainerBlock["background"], string> = {
  none: "",
  muted: "bg-muted/40",
  card: "bg-card",
  "primary-soft": "bg-primary/8",
  image: "bg-cover bg-center",
};

/**
 * Container is a section-style wrapper. It only renders the wrapper +
 * heading; the children are rendered by the parent (PageRenderer) so the
 * recursion can stay on the server side.
 */
export function ContainerBlockView({
  block,
  accent,
  children,
}: {
  block: ContainerBlock;
  accent: string;
  children: React.ReactNode;
}) {
  const isImage = block.background === "image" && block.backgroundImageUrl;
  const style: React.CSSProperties = isImage
    ? {
        backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url("${block.backgroundImageUrl}")`,
        color: "white",
      }
    : {};
  void accent;
  return (
    <section
      className={`border-b border-border ${BG_CLASS[block.background]} ${
        isImage ? "bg-cover bg-center text-white" : ""
      }`}
      style={style}
    >
      <div className={`mx-auto ${MAX_W[block.maxWidth]} ${PAD[block.padding]}`}>
        {block.heading && (
          <h2 className="mb-6 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {block.heading}
          </h2>
        )}
        {block.children.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-background/40 px-6 py-12 text-center text-sm text-muted-foreground">
            Lege container — sleep blokken hierin.
          </div>
        ) : (
          <div className={LAYOUT[block.layout]}>{children}</div>
        )}
      </div>
    </section>
  );
}
