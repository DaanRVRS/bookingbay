import Link from "next/link";
import type { ButtonBlock } from "@/lib/pages/blocks";

const SIZE_CLASS: Record<ButtonBlock["size"], string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-13 px-8 text-base",
};
const ALIGN_CLASS: Record<ButtonBlock["align"], string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

export function ButtonBlockView({
  block,
  accent,
}: {
  block: ButtonBlock;
  accent: string;
}) {
  if (!block.label) return null;
  const isPrimary = block.variant === "primary";
  const isOutline = block.variant === "outline";
  const style: React.CSSProperties = isPrimary
    ? { background: accent, color: "white" }
    : isOutline
      ? { borderColor: accent, color: accent }
      : { color: accent };
  return (
    <div className={`flex w-full px-4 py-6 sm:px-6 ${ALIGN_CLASS[block.align]}`}>
      <Link
        href={block.href || "#"}
        className={`inline-flex items-center justify-center rounded-lg font-medium transition-opacity hover:opacity-90 ${SIZE_CLASS[block.size]} ${
          isOutline ? "border-2 bg-transparent" : ""
        } ${isPrimary ? "shadow-sm" : ""}`}
        style={style}
      >
        {block.label}
      </Link>
    </div>
  );
}
