"use client";

import type { IntegrationDef } from "@/lib/integrations/catalog";
import { BrandIcon, hasBrandIcon } from "./BrandIcon";

/**
 * Tegel-logo voor catalogus en detail-pagina. Het brand-icoon komt uit de
 * lokaal gebundelde icon-data (geen runtime-call naar een Iconify-CDN, dus
 * geen IP-adres van de bezoeker naar een derde). Ontbreekt het icoon in de
 * bundel, dan tonen we een nette fallback met de eerste letter van de naam
 * in een gekleurde tegel.
 *
 * Brand-kleur voor de fallback bepalen we deterministisch uit de slug
 * (zelfde slug → zelfde kleur, scheelt er een mappingtabel bijhouden).
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

const INITIAL_TEXT: Record<"sm" | "md" | "lg", string> = {
  sm: "text-xs",
  md: "text-base",
  lg: "text-xl",
};

export function IntegrationLogo({
  integration,
  size = "md",
}: {
  integration: IntegrationDef;
  size?: "sm" | "md" | "lg";
}) {
  const useFallback = !hasBrandIcon(integration.iconifyId);

  return (
    <div
      className={`${TILE_SIZE[size]} ${RADIUS[size]} grid shrink-0 place-items-center border border-border shadow-[0_1px_2px_-1px_rgba(0,0,0,0.06)] ${
        useFallback ? "" : "bg-white dark:bg-zinc-100"
      }`}
      style={
        useFallback
          ? { backgroundColor: brandHue(integration.slug) }
          : undefined
      }
      role="img"
      aria-label={`${integration.name} logo`}
    >
      {useFallback ? (
        <span
          className={`${INITIAL_TEXT[size]} font-bold text-white drop-shadow-sm`}
        >
          {brandInitial(integration.name)}
        </span>
      ) : (
        <BrandIcon
          iconifyId={integration.iconifyId}
          className={`${ICON_SIZE[size]} text-zinc-900`}
        />
      )}
    </div>
  );
}

/** Pakt 1-2 letters uit de naam — "Google Calendar" → "G", "AFAS" → "A". */
function brandInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

/**
 * Deterministische pastel-achtige kleur o.b.v. de slug. Gebruikt 'n simpele
 * hash → hue rotatie. Geeft elk merk z'n eigen herkenbare tegelkleur in de
 * fallback zonder dat we per koppeling een kleur hoeven onderhouden.
 */
function brandHue(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (h * 31 + slug.charCodeAt(i)) % 360;
  }
  return `oklch(0.55 0.16 ${h})`;
}
