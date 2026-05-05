import {
  Package,
  Truck,
  Calendar,
  Clock,
  Shield,
  Star,
  Heart,
  MapPin,
  Phone,
  Mail,
  Users,
  CheckCircle2,
  Sparkles,
  ThumbsUp,
  Tag,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { IconRowBlock, IconKey } from "@/lib/pages/blocks";

const ICON_MAP: Record<IconKey, LucideIcon> = {
  Package,
  Truck,
  Calendar,
  Clock,
  Shield,
  Star,
  Heart,
  MapPin,
  Phone,
  Mail,
  Users,
  CheckCircle2,
  Sparkles,
  ThumbsUp,
  Tag,
  Wrench,
};

export function IconRowBlockView({
  block,
  accent,
}: {
  block: IconRowBlock;
  accent: string;
}) {
  if (block.items.length === 0) return null;
  const cols =
    block.items.length === 1
      ? "grid-cols-1"
      : block.items.length === 2
        ? "grid-cols-2"
        : block.items.length === 3
          ? "grid-cols-1 sm:grid-cols-3"
          : "grid-cols-2 sm:grid-cols-4";

  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {block.heading && (
          <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            {block.heading}
          </h2>
        )}
        <div className={`grid gap-6 ${cols}`}>
          {block.items.map((item, i) => {
            const Icon = ICON_MAP[item.icon] ?? CheckCircle2;
            return (
              <div key={i} className="flex flex-col items-center gap-2 text-center">
                <span
                  className="grid size-12 place-items-center rounded-full"
                  style={{ background: `color-mix(in oklch, ${accent} 12%, transparent)`, color: accent }}
                >
                  <Icon className="size-6" />
                </span>
                {item.label && <p className="font-semibold">{item.label}</p>}
                {item.sublabel && (
                  <p className="text-sm text-muted-foreground">{item.sublabel}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
