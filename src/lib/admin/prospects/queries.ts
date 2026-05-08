import "server-only";
import { db } from "@/lib/db";

export const PROSPECT_STATUSES = [
  { value: "lead", label: "Lead", color: "oklch(0.65 0.16 260)" },
  { value: "gecontacteerd", label: "Gecontacteerd", color: "oklch(0.65 0.13 220)" },
  { value: "demo-gepland", label: "Demo gepland", color: "oklch(0.7 0.15 90)" },
  { value: "demo-gehad", label: "Demo gehad", color: "oklch(0.7 0.16 60)" },
  { value: "voorstel", label: "Voorstel uit", color: "oklch(0.6 0.18 30)" },
  { value: "gewonnen", label: "Gewonnen", color: "oklch(0.55 0.16 150)" },
  { value: "verloren", label: "Verloren", color: "oklch(0.5 0.04 250)" },
] as const;

export const PROSPECT_SOURCES = [
  { value: "website", label: "Website" },
  { value: "referral", label: "Doorverwijzing" },
  { value: "cold-call", label: "Koude acquisitie" },
  { value: "event", label: "Event" },
  { value: "other", label: "Anders" },
] as const;

export type ProspectStatus = (typeof PROSPECT_STATUSES)[number]["value"];

export function describeProspectStatus(value: string) {
  return (
    PROSPECT_STATUSES.find((s) => s.value === value) ?? {
      value,
      label: value,
      color: "oklch(0.5 0.02 250)",
    }
  );
}

export function safeTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((s) => s.trim().slice(0, 40))
    .slice(0, 12);
}

export async function listProspects(opts?: { status?: string }) {
  return db.adminProspect.findMany({
    where: opts?.status ? { status: opts.status } : undefined,
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      owner: { select: { id: true, name: true, email: true } },
      convertedOrg: { select: { id: true, name: true, slug: true } },
      _count: { select: { reminders: true, interactions: true } },
    },
  });
}

export async function getProspectById(id: string) {
  return db.adminProspect.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      convertedOrg: { select: { id: true, name: true, slug: true } },
    },
  });
}

export async function listInteractionsForProspect(prospectId: string) {
  return db.prospectInteraction.findMany({
    where: { prospectId },
    orderBy: { occurredAt: "desc" },
    take: 100,
    include: { actor: { select: { id: true, name: true, email: true } } },
  });
}

export async function listOpenRemindersForProspect(prospectId: string) {
  return db.prospectReminder.findMany({
    where: { prospectId, completedAt: null },
    orderBy: { dueAt: "asc" },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function listCompletedRemindersForProspect(prospectId: string) {
  return db.prospectReminder.findMany({
    where: { prospectId, completedAt: { not: null } },
    orderBy: { completedAt: "desc" },
    take: 20,
  });
}

/** Cross-prospect due reminders for the admin overview widget + cron. */
export async function listDueProspectReminders(now: Date = new Date()) {
  return db.prospectReminder.findMany({
    where: { completedAt: null, dueAt: { lte: now } },
    orderBy: { dueAt: "asc" },
    include: {
      prospect: { select: { id: true, name: true, companyName: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function getProspectStatusCounts() {
  const groups = await db.adminProspect.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const map: Record<string, number> = {};
  for (const g of groups) map[g.status] = g._count._all;
  return map;
}
