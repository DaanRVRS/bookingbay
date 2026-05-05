import type { SpacerBlock } from "@/lib/pages/blocks";

const SIZES: Record<SpacerBlock["size"], string> = {
  sm: "h-8 sm:h-12",
  md: "h-16 sm:h-24",
  lg: "h-24 sm:h-40",
};

export function SpacerBlockView({ block }: { block: SpacerBlock }) {
  return <div aria-hidden className={SIZES[block.size]} />;
}
