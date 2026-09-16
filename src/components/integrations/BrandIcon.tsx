"use client";

import { Icon } from "@iconify/react";
import iconData from "@/lib/integrations/icon-data.json";

/**
 * Rendert een merklogo uit de lokaal gebundelde icon-data
 * (src/lib/integrations/icon-data.json, gegenereerd door
 * scripts/build-integration-icons.mjs). Er gaat géén verzoek naar
 * api.iconify.design of een andere Iconify-host: het icoon-object wordt
 * direct aan <Icon /> gegeven, die het inline als SVG tekent.
 *
 * Onbekend icoon → null, zodat de aanroeper een fallback kan tonen.
 */

interface LocalIcon {
  body: string;
  width: number;
  height: number;
  left?: number;
  top?: number;
}

const ICONS = iconData as Record<string, LocalIcon>;

export function hasBrandIcon(iconifyId: string): boolean {
  return Boolean(ICONS[iconifyId]);
}

export function BrandIcon({
  iconifyId,
  className,
}: {
  iconifyId: string;
  className?: string;
}) {
  const data = ICONS[iconifyId];
  if (!data) return null;
  return <Icon icon={data} className={className} aria-hidden />;
}
