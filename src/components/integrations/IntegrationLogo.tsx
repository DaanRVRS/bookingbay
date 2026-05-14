"use client";

import { useEffect, useState } from "react";
import { Icon, loadIcon } from "@iconify/react";
import type { IntegrationDef } from "@/lib/integrations/catalog";

/**
 * Tegel-logo voor catalogus en detail-pagina. Probeert het brand-icoon via
 * Iconify te laden (CDN-fetch op eerste render, daarna cached). Lukt dat
 * niet — omdat Iconify geen logo heeft voor deze vendor of de CDN dicht
 * staat — dan tonen we een nette fallback met de eerste letter van de
 * naam in een gekleurde tegel.
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
  // We tracken welk icoon successvol of failed geladen is — niet een
  // simpele 'loading'-flag, omdat we anders setState in een effect zouden
  // moeten doen bij iconifyId-wisselingen. Status wordt afgeleid door de
  // huidige iconifyId tegen 'loadedId' / 'failedId' te vergelijken.
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadIcon(integration.iconifyId)
      .then(() => {
        if (!cancelled) setLoadedId(integration.iconifyId);
      })
      .catch(() => {
        if (!cancelled) setFailedId(integration.iconifyId);
      });
    return () => {
      cancelled = true;
    };
  }, [integration.iconifyId]);

  const isOk = loadedId === integration.iconifyId;
  const isFail = failedId === integration.iconifyId;
  // Tijdens de eerste paar ms (vóór loadIcon resolved) tonen we óók de
  // fallback ipv een leeg gat. Bij een cache-hit resolved loadIcon op de
  // volgende tick, dus geen merkbare flicker.
  const useFallback = !isOk || isFail;

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
      aria-label={`${integration.name} logo`}
    >
      {useFallback ? (
        <span
          className={`${INITIAL_TEXT[size]} font-bold text-white drop-shadow-sm`}
        >
          {brandInitial(integration.name)}
        </span>
      ) : (
        <Icon icon={integration.iconifyId} className={ICON_SIZE[size]} />
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
