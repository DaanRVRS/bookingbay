import "server-only";
import { db } from "@/lib/db";

export const CRM_STATUSES = [
  { value: "lead", label: "Lead", color: "oklch(0.65 0.16 260)" },
  { value: "trial", label: "Trial", color: "oklch(0.7 0.15 90)" },
  { value: "active", label: "Actief", color: "oklch(0.6 0.14 150)" },
  { value: "at-risk", label: "Risico", color: "oklch(0.65 0.18 60)" },
  { value: "churned", label: "Opgezegd", color: "oklch(0.55 0.15 25)" },
  { value: "frozen", label: "Bevroren", color: "oklch(0.55 0.02 250)" },
] as const;

export type CrmStatus = (typeof CRM_STATUSES)[number]["value"];

export function describeStatus(value: string) {
  return (
    CRM_STATUSES.find((s) => s.value === value) ?? {
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

export async function listInteractionsForOrg(organizationId: string, take = 100) {
  const rows = await db.orgInteraction.findMany({
    where: { organizationId },
    orderBy: { occurredAt: "desc" },
    take,
    include: {
      actor: { select: { id: true, name: true, email: true } },
    },
  });
  return rows;
}

export async function listOpenRemindersForOrg(organizationId: string) {
  const rows = await db.orgReminder.findMany({
    where: { organizationId, completedAt: null },
    orderBy: { dueAt: "asc" },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
  return rows;
}

export async function listCompletedRemindersForOrg(organizationId: string, take = 30) {
  const rows = await db.orgReminder.findMany({
    where: { organizationId, completedAt: { not: null } },
    orderBy: { completedAt: "desc" },
    take,
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });
  return rows;
}

/**
 * Reminders that are due (today or earlier) and not yet completed.
 * Used by the admin overview widget + the daily cron.
 */
export async function listDueReminders(now: Date = new Date()) {
  return db.orgReminder.findMany({
    where: { completedAt: null, dueAt: { lte: now } },
    orderBy: { dueAt: "asc" },
    include: {
      organization: { select: { id: true, name: true, slug: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });
}

/**
 * Counts (per status) used to drive a small overview at the top of
 * /admin/organizations and the /admin overview widget.
 */
export async function getCrmStatusCounts() {
  const groups = await db.organization.groupBy({
    by: ["crmStatus"],
    _count: { _all: true },
  });
  const map: Record<string, number> = {};
  for (const g of groups) map[g.crmStatus] = g._count._all;
  return map;
}

export async function countOpenReminders(): Promise<number> {
  return db.orgReminder.count({ where: { completedAt: null } });
}

export async function countOverdueReminders(now: Date = new Date()): Promise<number> {
  return db.orgReminder.count({
    where: { completedAt: null, dueAt: { lt: now } },
  });
}
