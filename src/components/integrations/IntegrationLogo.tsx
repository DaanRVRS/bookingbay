"use client";

import { Icon } from "@iconify/react";
import type { IntegrationDef } from "@/lib/integrations/catalog";

/**
 * Tegel-logo voor catalogus en detail-pagina. Rendert het officiële
 * brand-icoon via Iconify (gratis CDN-fetch op eerste render, daarna
 * cached). De achtergrond is een neutrale witte/grijs tegel zodat
 * multi-color logo's er goed uit komen. Voor brands waar Iconify het
 * niet voor heeft (kleine NL-vendors) zit er een Material-Design-Icons
 * fallback in de catalogus.
 */

const TILE_SIZE: Record<"sm" | "md" | "lg", string> = {
  sm: "size-8",
  md: "size-12",
  lg: "size-16",
};

const ICON_SIZE: Record<"sm" | "md" | "lg", string> = {
  sm: "size-5",
  md: "size-8",
  lg: "size-10",
};

const RADIUS: Record<"sm" | "md" | "lg", string> = {
  sm: "rounded-md",
  md: "rounded-xl",
  lg: "rounded-2xl",
};

export function IntegrationLogo({
  integration,
  size = "md",
}: {
  integration: IntegrationDef;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div
      className={`${TILE_SIZE[size]} ${RADIUS[size]} grid shrink-0 place-items-center border border-border bg-white shadow-[0_1px_2px_-1px_rgba(0,0,0,0.06)] dark:bg-zinc-100`}
    >
      <Icon
        icon={integration.iconifyId}
        className={ICON_SIZE[size]}
        // Iconify rendert multi-color SVG's; geen `color` prop nodig.
        aria-label={`${integration.name} logo`}
      />
    </div>
  );
}
