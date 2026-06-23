import type { BusinessHours } from "@/lib/business-hours/schemas";

/**
 * Gedeelde logica voor het effectieve boekvenster van een item op een
 * specifieke dag. Gebruikt door de server (getItemAvailability) én de twee
 * client-pickers (widget + dashboard), zodat de getoonde slots exact matchen
 * met wat de server als (on)beschikbaar berekent.
 *
 * - followsOrgHours = true  → het venster = de organisatie-openingstijden van
 *   die weekdag. Een gesloten dag levert null op (= niet boekbaar).
 * - followsOrgHours = false → de eigen per-weekdag tijden (itemHours) als die
 *   gezet zijn, anders het vaste venster (windowStartMin..EndMin) als fallback.
 */
export interface SlotWindowConfig {
  windowStartMin: number;
  windowEndMin: number;
  followsOrgHours: boolean;
  orgHours: BusinessHours | null;
  itemHours: BusinessHours | null;
}

export function hhmmToMin(s: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return 0;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Effectief boekvenster voor `day` in minuten vanaf middernacht.
 * Retourneert null wanneer die dag gesloten is (item niet boekbaar).
 */
export function windowForDay(
  day: Date,
  cfg: SlotWindowConfig,
): { startMin: number; endMin: number } | null {
  // Aanhouden → org-tijden; eigen tijden → itemHours. Geen schema → vast venster.
  const schedule = cfg.followsOrgHours ? cfg.orgHours : cfg.itemHours;
  if (!schedule) {
    return { startMin: cfg.windowStartMin, endMin: cfg.windowEndMin };
  }
  // BusinessHours loopt ma..zo (index 0 = maandag); Date.getDay() is zo..za.
  const idx = (day.getDay() + 6) % 7;
  const d = schedule[idx];
  if (!d || d.closed) return null;
  const startMin = hhmmToMin(d.open || "09:00");
  const endMin = hhmmToMin(d.close || "17:00");
  if (!(endMin > startMin)) return null;
  return { startMin, endMin };
}
