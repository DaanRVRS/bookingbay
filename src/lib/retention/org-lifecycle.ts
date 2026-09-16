import { addDays, addMonths, differenceInCalendarDays, subDays } from "date-fns";
import { RETENTION } from "@/lib/company";

/**
 * Pure beslislogica voor het automatisch verwijderen van gestopte
 * organisaties. Geen database, geen mail — zodat het los te testen is
 * (org-lifecycle.test.ts). De cron-stap in org-deletion.ts voert uit.
 *
 * De regel (ook zo in voorwaarden, privacyverklaring en DPA):
 *  - "gestopt" = geen lopend Mollie-abonnement, geen betaalde periode meer
 *    en geen lopende proefperiode; de stopdatum is de laatste einddatum.
 *  - RETENTION.orgDeleteMonths na de stopdatum wordt de organisatie
 *    verwijderd; RETENTION.orgDeleteWarnDays daarvóór gaat er één
 *    waarschuwingsmail naar de eigenaren (deletionWarnedAt).
 *  - Wie nooit is gewaarschuwd, wordt niet verwijderd — ook niet als de
 *    termijn allang om is. Eerst waarschuwen, dan pas na de wachttijd wissen.
 *  - Wordt de organisatie weer actief, dan vervalt de waarschuwing.
 */

export interface OrgLifecycleFields {
  subscriptionStatus: string | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  paidUntil: Date | null;
  suspendedAt: Date | null;
  deletionWarnedAt: Date | null;
}

/**
 * Stopdatum van de organisatie, of null als ze nog loopt (of als we het
 * niet kunnen bepalen — dan blijven we er vanaf).
 */
export function orgStoppedAt(org: OrgLifecycleFields, now: Date): Date | null {
  // Een Mollie-abonnement dat loopt, of waarvoor Mollie nog incasso-pogingen
  // doet, telt als actief — ook als currentPeriodEnd achterloopt.
  if (org.subscriptionStatus === "active" || org.subscriptionStatus === "past_due") {
    return null;
  }

  const ends = [org.trialEndsAt, org.paidUntil, org.currentPeriodEnd].filter(
    (d): d is Date => d instanceof Date,
  );
  if (ends.some((d) => d.getTime() > now.getTime())) return null;
  if (ends.length > 0) {
    return new Date(Math.max(...ends.map((d) => d.getTime())));
  }

  // Geen einddatum bekend (organisatie van vóór de proefperiode-logica):
  // alleen een suspensie telt dan als stopmoment. Anders niets doen.
  return org.suspendedAt ?? null;
}

export interface OrgDeletionSchedule {
  stoppedAt: Date;
  /** Vroegste verwijderdatum: stoppedAt + RETENTION.orgDeleteMonths. */
  deleteAt: Date;
  /** Vanaf wanneer de waarschuwing mag: deleteAt − RETENTION.orgDeleteWarnDays. */
  warnAt: Date;
}

export function orgDeletionSchedule(
  org: OrgLifecycleFields,
  now: Date,
): OrgDeletionSchedule | null {
  const stoppedAt = orgStoppedAt(org, now);
  if (!stoppedAt) return null;
  const deleteAt = addMonths(stoppedAt, RETENTION.orgDeleteMonths);
  return { stoppedAt, deleteAt, warnAt: subDays(deleteAt, RETENTION.orgDeleteWarnDays) };
}

/**
 * Alleen een waarschuwing die ná de huidige stopdatum is verstuurd telt.
 * Een oudere (van een eerdere stop, daarna hervat en opnieuw gestopt) is
 * niet meer geldig: dan waarschuwen we opnieuw.
 */
export function validWarning(org: OrgLifecycleFields, stoppedAt: Date): Date | null {
  if (!org.deletionWarnedAt) return null;
  return org.deletionWarnedAt.getTime() > stoppedAt.getTime() ? org.deletionWarnedAt : null;
}

/**
 * De datum die in de waarschuwingsmail staat en waarop de cron daadwerkelijk
 * verwijdert: nooit eerder dan orgDeleteWarnDays na de waarschuwing, ook
 * als de bewaartermijn al om was toen we waarschuwden.
 */
export function plannedDeletionDate(schedule: OrgDeletionSchedule, warnedAt: Date): Date {
  const earliest = addDays(warnedAt, RETENTION.orgDeleteWarnDays);
  return earliest.getTime() > schedule.deleteAt.getTime() ? earliest : schedule.deleteAt;
}

export type OrgRetentionDecision = "none" | "warn" | "delete" | "clear-warning";

/** Wat de cron vandaag met deze organisatie moet doen. */
export function decideOrgRetention(org: OrgLifecycleFields, now: Date): OrgRetentionDecision {
  const schedule = orgDeletionSchedule(org, now);
  if (!schedule) return org.deletionWarnedAt ? "clear-warning" : "none";

  const warnedAt = validWarning(org, schedule.stoppedAt);
  if (warnedAt) {
    // Op kalenderdagen vergelijken: de cron draait één keer per dag en de
    // mail noemt een datum, geen tijdstip.
    const termReached = differenceInCalendarDays(now, schedule.deleteAt) >= 0;
    const waitedLongEnough = differenceInCalendarDays(now, warnedAt) >= RETENTION.orgDeleteWarnDays;
    return termReached && waitedLongEnough ? "delete" : "none";
  }

  return differenceInCalendarDays(now, schedule.warnAt) >= 0 ? "warn" : "none";
}
