"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { audit } from "@/lib/audit/log";
import type { ActionResult } from "@/lib/auth/schemas";
import { PROSPECT_STATUSES, safeTags } from "./queries";
import {
  notifyNewProspect,
  notifyProspectStatusChange,
} from "@/lib/discord/notifications";

const STATUS_VALUES = PROSPECT_STATUSES.map((s) => s.value);

const prospectCreateSchema = z.object({
  name: z.string().min(2).max(120),
  companyName: z.string().max(160).optional().default(""),
  email: z
    .string()
    .max(200)
    .optional()
    .default("")
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Ongeldig e-mailadres"),
  phone: z.string().max(40).optional().default(""),
  source: z.string().max(40).optional().default(""),
  notes: z.string().max(4000).optional().default(""),
});

export type ProspectCreateInput = z.infer<typeof prospectCreateSchema>;

export async function createProspectAction(
  input: ProspectCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const me = await requireAdmin();
  const parsed = prospectCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const created = await db.adminProspect.create({
    data: {
      name: parsed.data.name,
      companyName: parsed.data.companyName || null,
      email: parsed.data.email ? parsed.data.email.toLowerCase() : null,
      phone: parsed.data.phone || null,
      source: parsed.data.source || null,
      notes: parsed.data.notes || null,
      createdById: me.id,
      ownerUserId: me.id,
    },
    select: { id: true },
  });

  await audit({
    actorUserId: me.id,
    action: "prospect.create",
    resource: "prospect",
    resourceId: created.id,
    metadata: { name: parsed.data.name, email: parsed.data.email || null },
  });

  await notifyNewProspect({
    prospectId: created.id,
    name: parsed.data.name,
    companyName: parsed.data.companyName || null,
    email: parsed.data.email ? parsed.data.email.toLowerCase() : null,
    source: parsed.data.source || null,
    ownerName: me.name,
    ownerEmail: me.email,
  });

  revalidatePath("/admin/crm");
  return { ok: true, data: { id: created.id } };
}

const prospectUpdateSchema = prospectCreateSchema.extend({
  id: z.string().min(1),
  ownerUserId: z.string().nullable().optional(),
});

export type ProspectUpdateInput = z.infer<typeof prospectUpdateSchema>;

export async function updateProspectAction(
  input: ProspectUpdateInput,
): Promise<ActionResult> {
  const me = await requireAdmin();
  const parsed = prospectUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }
  const existing = await db.adminProspect.findUnique({
    where: { id: parsed.data.id },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };

  await db.adminProspect.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      companyName: parsed.data.companyName || null,
      email: parsed.data.email ? parsed.data.email.toLowerCase() : null,
      phone: parsed.data.phone || null,
      source: parsed.data.source || null,
      notes: parsed.data.notes || null,
      ownerUserId: parsed.data.ownerUserId ?? undefined,
    },
  });

  await audit({
    actorUserId: me.id,
    action: "prospect.update",
    resource: "prospect",
    resourceId: parsed.data.id,
  });

  revalidatePath("/admin/crm");
  revalidatePath(`/admin/crm/${parsed.data.id}`);
  return { ok: true };
}

export async function setProspectStatusAction(
  id: string,
  status: string,
): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!STATUS_VALUES.includes(status as (typeof STATUS_VALUES)[number])) {
    return { ok: false, error: "Ongeldige status" };
  }
  const existing = await db.adminProspect.findUnique({
    where: { id },
    select: { id: true, status: true, name: true, companyName: true },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };
  if (existing.status === status) {
    return { ok: true };
  }

  await db.adminProspect.update({
    where: { id },
    data: { status },
  });

  await audit({
    actorUserId: me.id,
    action: "prospect.status.change",
    resource: "prospect",
    resourceId: id,
    metadata: { from: existing.status, to: status },
  });

  await notifyProspectStatusChange({
    prospectId: id,
    name: existing.name,
    companyName: existing.companyName,
    fromStatus: existing.status,
    toStatus: status,
    actorName: me.name,
    actorEmail: me.email,
  });

  revalidatePath("/admin/crm");
  revalidatePath(`/admin/crm/${id}`);
  return { ok: true };
}

export async function setProspectTagsAction(
  id: string,
  tags: string[],
): Promise<ActionResult> {
  const me = await requireAdmin();
  const cleaned = safeTags(tags);
  await db.adminProspect.update({ where: { id }, data: { tags: cleaned } });
  await audit({
    actorUserId: me.id,
    action: "prospect.tags.update",
    resource: "prospect",
    resourceId: id,
    metadata: { tags: cleaned },
  });
  revalidatePath(`/admin/crm/${id}`);
  return { ok: true };
}

export async function deleteProspectAction(id: string): Promise<ActionResult> {
  const me = await requireAdmin();
  const existing = await db.adminProspect.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };
  await db.adminProspect.delete({ where: { id } });
  await audit({
    actorUserId: me.id,
    action: "prospect.delete",
    resource: "prospect",
    resourceId: id,
    metadata: { name: existing.name },
  });
  revalidatePath("/admin/crm");
  return { ok: true };
}

/* ----------------------- Interactions ----------------------- */

const interactionSchema = z.object({
  prospectId: z.string().min(1),
  type: z.enum(["call", "email", "meeting", "note"]),
  subject: z.string().min(2).max(160),
  body: z.string().max(4000).default(""),
  occurredAt: z.string().optional(),
});

export type ProspectInteractionInput = z.infer<typeof interactionSchema>;

export async function createProspectInteractionAction(
  input: ProspectInteractionInput,
): Promise<ActionResult<{ id: string }>> {
  const me = await requireAdmin();
  const parsed = interactionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ongeldige invoer" };

  const occurredAt = parsed.data.occurredAt
    ? new Date(parsed.data.occurredAt)
    : new Date();
  if (Number.isNaN(occurredAt.getTime())) {
    return { ok: false, error: "Ongeldige datum" };
  }

  const created = await db.prospectInteraction.create({
    data: {
      prospectId: parsed.data.prospectId,
      actorUserId: me.id,
      type: parsed.data.type,
      subject: parsed.data.subject,
      body: parsed.data.body || null,
      occurredAt,
    },
    select: { id: true },
  });

  await audit({
    actorUserId: me.id,
    action: "prospect.interaction.create",
    resource: "prospect-interaction",
    resourceId: created.id,
    metadata: { prospectId: parsed.data.prospectId, type: parsed.data.type },
  });

  revalidatePath(`/admin/crm/${parsed.data.prospectId}`);
  return { ok: true, data: { id: created.id } };
}

export async function deleteProspectInteractionAction(
  id: string,
): Promise<ActionResult> {
  const me = await requireAdmin();
  const existing = await db.prospectInteraction.findUnique({
    where: { id },
    select: { id: true, prospectId: true },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };
  await db.prospectInteraction.delete({ where: { id } });
  await audit({
    actorUserId: me.id,
    action: "prospect.interaction.delete",
    resource: "prospect-interaction",
    resourceId: id,
  });
  revalidatePath(`/admin/crm/${existing.prospectId}`);
  return { ok: true };
}

/* ----------------------- Reminders ----------------------- */

const reminderCreateSchema = z.object({
  prospectId: z.string().min(1),
  title: z.string().min(2).max(200),
  notes: z.string().max(2000).default(""),
  dueAt: z.string().min(1),
  assignedToUserId: z.string().nullable().optional(),
});

export type ProspectReminderCreateInput = z.infer<typeof reminderCreateSchema>;

export async function createProspectReminderAction(
  input: ProspectReminderCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const me = await requireAdmin();
  const parsed = reminderCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ongeldige invoer" };

  const dueAt = new Date(parsed.data.dueAt);
  if (Number.isNaN(dueAt.getTime())) return { ok: false, error: "Ongeldige datum" };

  const created = await db.prospectReminder.create({
    data: {
      prospectId: parsed.data.prospectId,
      createdById: me.id,
      assignedToUserId: parsed.data.assignedToUserId ?? null,
      title: parsed.data.title,
      notes: parsed.data.notes || null,
      dueAt,
    },
    select: { id: true },
  });

  await audit({
    actorUserId: me.id,
    action: "prospect.reminder.create",
    resource: "prospect-reminder",
    resourceId: created.id,
    metadata: { title: parsed.data.title, dueAt: dueAt.toISOString() },
  });

  revalidatePath(`/admin/crm/${parsed.data.prospectId}`);
  revalidatePath("/admin");
  return { ok: true, data: { id: created.id } };
}

export async function completeProspectReminderAction(
  id: string,
): Promise<ActionResult> {
  const me = await requireAdmin();
  const existing = await db.prospectReminder.findUnique({
    where: { id },
    select: { id: true, prospectId: true, completedAt: true },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };
  if (existing.completedAt) return { ok: false, error: "Al afgerond" };

  await db.prospectReminder.update({
    where: { id },
    data: { completedAt: new Date() },
  });

  await audit({
    actorUserId: me.id,
    action: "prospect.reminder.complete",
    resource: "prospect-reminder",
    resourceId: id,
  });
  revalidatePath(`/admin/crm/${existing.prospectId}`);
  revalidatePath("/admin");
  return { ok: true };
}

export async function reopenProspectReminderAction(
  id: string,
): Promise<ActionResult> {
  const me = await requireAdmin();
  const existing = await db.prospectReminder.findUnique({
    where: { id },
    select: { id: true, prospectId: true, completedAt: true },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };
  await db.prospectReminder.update({
    where: { id },
    data: { completedAt: null, notifiedAt: null },
  });
  await audit({
    actorUserId: me.id,
    action: "prospect.reminder.reopen",
    resource: "prospect-reminder",
    resourceId: id,
  });
  revalidatePath(`/admin/crm/${existing.prospectId}`);
  return { ok: true };
}

export async function deleteProspectReminderAction(
  id: string,
): Promise<ActionResult> {
  const me = await requireAdmin();
  const existing = await db.prospectReminder.findUnique({
    where: { id },
    select: { id: true, prospectId: true, title: true },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };
  await db.prospectReminder.delete({ where: { id } });
  await audit({
    actorUserId: me.id,
    action: "prospect.reminder.delete",
    resource: "prospect-reminder",
    resourceId: id,
    metadata: { title: existing.title },
  });
  revalidatePath(`/admin/crm/${existing.prospectId}`);
  return { ok: true };
}

/* ----------------------- Convert to org ----------------------- */

export async function convertProspectToOrgAction(input: {
  prospectId: string;
  organizationId: string;
}): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!input.prospectId || !input.organizationId) {
    return { ok: false, error: "Ongeldige invoer" };
  }
  const [prospect, org] = await Promise.all([
    db.adminProspect.findUnique({ where: { id: input.prospectId } }),
    db.organization.findUnique({ where: { id: input.organizationId } }),
  ]);
  if (!prospect) return { ok: false, error: "Prospect niet gevonden" };
  if (!org) return { ok: false, error: "Organisatie niet gevonden" };
  if (prospect.convertedOrgId) {
    return { ok: false, error: "Prospect is al gekoppeld" };
  }

  await db.adminProspect.update({
    where: { id: prospect.id },
    data: {
      convertedOrgId: org.id,
      convertedAt: new Date(),
      status: "gewonnen",
    },
  });

  await audit({
    actorUserId: me.id,
    organizationId: org.id,
    action: "prospect.convert",
    resource: "prospect",
    resourceId: prospect.id,
    metadata: { organizationId: org.id, organizationName: org.name },
  });

  revalidatePath(`/admin/crm/${prospect.id}`);
  revalidatePath(`/admin/organizations/${org.id}`);
  revalidatePath("/admin/crm");
  return { ok: true };
}

/**
 * Auto-link helper used during the user-register flow. If a prospect with
 * a matching e-mail exists and isn't yet linked, attach it to the new org
 * and mark as won. Idempotent and silent — never throws on a no-match.
 */
export async function autoLinkProspectByEmail(
  email: string,
  organizationId: string,
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;
  try {
    const prospect = await db.adminProspect.findFirst({
      where: { email: normalized, convertedOrgId: null },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (!prospect) return;
    await db.adminProspect.update({
      where: { id: prospect.id },
      data: {
        convertedOrgId: organizationId,
        convertedAt: new Date(),
        status: "gewonnen",
      },
    });
    await audit({
      organizationId,
      action: "prospect.convert.auto",
      resource: "prospect",
      resourceId: prospect.id,
      metadata: { email: normalized, byAuto: true },
    });
  } catch (e) {
    console.error("[autoLinkProspectByEmail] failed:", e);
  }
}
