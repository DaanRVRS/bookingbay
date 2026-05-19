"use client";

import {
  BadgeCheck,
  Calendar,
  Check,
  Clock,
  CreditCard,
  Gift,
  Heart,
  Leaf,
  Lock,
  Mail,
  MapPin,
  Phone,
  Shield,
  Sparkles,
  Star,
  ThumbsUp,
  Truck,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { UspIconKey } from "@/lib/widget/theme";

const MAP: Record<UspIconKey, LucideIcon> = {
  check: Check,
  star: Star,
  shield: Shield,
  clock: Clock,
  zap: Zap,
  heart: Heart,
  "badge-check": BadgeCheck,
  truck: Truck,
  phone: Phone,
  mail: Mail,
  "map-pin": MapPin,
  calendar: Calendar,
  "credit-card": CreditCard,
  gift: Gift,
  sparkles: Sparkles,
  "thumbs-up": ThumbsUp,
  leaf: Leaf,
  lock: Lock,
};

export function uspIcon(key: string): LucideIcon {
  return MAP[key as UspIconKey] ?? Check;
}

export function UspIcon({
  icon,
  className,
  style,
}: {
  icon: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Icon = uspIcon(icon);
  return <Icon className={className} style={style} />;
}
