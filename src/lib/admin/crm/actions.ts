"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { audit } from "@/lib/audit/log";
import type { ActionResult } from "@/lib/auth/schemas";
import { CRM_STATUSES, safeTags } from "./queries";

const interactionSchema = z.object({
  organizationId: z.string().min(1),
  type: z.enum(["call", "email", "meeting", "note"]),
  subject: z.string().min(2, "Te kort").max(160),
  body: z.string().max(4000).default(""),
  occurredAt: z.string().optional(),
});

export type InteractionInput = z.infer<typeof interactionSchema>;

export async function createInteractionAction(
  input: InteractionInput,
): Promise<ActionResult<{ id: string }>> {
  const me = await requireAdmin();
  const parsed = interactionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }
  const occurredAt = parsed.data.occurredAt
    ? new Date(parsed.data.occurredAt)
    : new Date();
  if (Number.isNaN(occurredAt.getTime())) {
    return { ok: false, error: "Ongeldige datum" };
  }

  const created = await db.orgInteraction.create({
    data: {
      organizationId: parsed.data.organizationId,
      actorUserId: me.id,
      type: parsed.data.type,
      subject: parsed.data.subject,
      body: parsed.data.body || null,
      occurredAt,
    },
    select: { id: true },
  });

  await audit({
    organizationId: parsed.data.organizationId,
    actorUserId: me.id,
    action: "crm.interaction.create",
    resource: "interaction",
    resourceId: created.id,
    metadata: { type: parsed.data.type, subject: parsed.data.subject },
  });

  revalidatePath(`/admin/organizations/${parsed.data.organizationId}`);
  return { ok: true, data: { id: created.id } };
}

export async function deleteInteractionAction(id: string): Promise<ActionResult> {
  const me = await requireAdmin();
  const existing = await db.orgInteraction.findUnique({
    where: { id },
    select: { id: true, organizationId: true, subject: true },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };

  await db.orgInteraction.delete({ where: { id } });

  await audit({
    organizationId: existing.organizationId,
    actorUserId: me.id,
    action: "crm.interaction.delete",
    resource: "interaction",
    resourceId: id,
    metadata: { subject: existing.subject },
  });

  revalidatePath(`/admin/organizations/${existing.organizationId}`);
  return { ok: true };
}

const reminderCreateSchema = z.object({
  organizationId: z.string().min(1),
  title: z.string().min(2).max(200),
  notes: z.string().max(2000).default(""),
  dueAt: z.string().min(1, "Datum is verplicht"),
  assignedToUserId: z.string().nullable().optional(),
});

export type ReminderCreateInput = z.infer<typeof reminderCreateSchema>;

export async function createReminderAction(
  input: ReminderCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const me = await requireAdmin();
  const parsed = reminderCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }
  const dueAt = new Date(parsed.data.dueAt);
  if (Number.isNaN(dueAt.getTime())) return { ok: false, error: "Ongeldige datum" };

  const created = await db.orgReminder.create({
    data: {
      organizationId: parsed.data.organizationId,
      createdById: me.id,
      assignedToUserId: parsed.data.assignedToUserId ?? null,
      title: parsed.data.title,
      notes: parsed.data.notes || null,
      dueAt,
    },
    select: { id: true },
  });

  await audit({
    organizationId: parsed.data.organizationId,
    actorUserId: me.id,
    action: "crm.reminder.create",
    resource: "reminder",
    resourceId: created.id,
    metadata: { title: parsed.data.title, dueAt: dueAt.toISOString() },
  });

  revalidatePath(`/admin/organizations/${parsed.data.organizationId}`);
  revalidatePath("/admin");
  return { ok: true, data: { id: created.id } };
}

export async function completeReminderAction(id: string): Promise<ActionResult> {
  const me = await requireAdmin();
  const existing = await db.orgReminder.findUnique({
    where: { id },
    select: { id: true, organizationId: true, completedAt: true, title: true },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };
  if (existing.completedAt) return { ok: false, error: "Al afgerond" };

  await db.orgReminder.update({
    where: { id },
    data: { completedAt: new Date() },
  });

  await audit({
    organizationId: existing.organizationId,
    actorUserId: me.id,
    action: "crm.reminder.complete",
    resource: "reminder",
    resourceId: id,
    metadata: { title: existing.title },
  });

  revalidatePath(`/admin/organizations/${existing.organizationId}`);
  revalidatePath("/admin");
  return { ok: true };
}

export async function reopenReminderAction(id: string): Promise<ActionResult> {
  const me = await requireAdmin();
  const existing = await db.orgReminder.findUnique({
    where: { id },
    select: { id: true, organizationId: true, completedAt: true },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };
  if (!existing.completedAt) return { ok: false, error: "Was niet afgerond" };

  await db.orgReminder.update({
    where: { id },
    data: { completedAt: null, notifiedAt: null },
  });

  await audit({
    organizationId: existing.organizationId,
    actorUserId: me.id,
    action: "crm.reminder.reopen",
    resource: "reminder",
    resourceId: id,
  });

  revalidatePath(`/admin/organizations/${existing.organizationId}`);
  return { ok: true };
}

export async function deleteReminderAction(id: string): Promise<ActionResult> {
  const me = await requireAdmin();
  const existing = await db.orgReminder.findUnique({
    where: { id },
    select: { id: true, organizationId: true, title: true },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };

  await db.orgReminder.delete({ where: { id } });
  await audit({
    organizationId: existing.organizationId,
    actorUserId: me.id,
    action: "crm.reminder.delete",
    resource: "reminder",
    resourceId: id,
    metadata: { title: existing.title },
  });

  revalidatePath(`/admin/organizations/${existing.organizationId}`);
  return { ok: true };
}

const STATUS_VALUES = CRM_STATUSES.map((s) => s.value);

export async function setOrgCrmStatusAction(
  organizationId: string,
  status: string,
): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!STATUS_VALUES.includes(status as (typeof STATUS_VALUES)[number])) {
    return { ok: false, error: "Ongeldige status" };
  }
  const existing = await db.organization.findUnique({
    where: { id: organizationId },
    select: { crmStatus: true },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };

  await db.organization.update({
    where: { id: organizationId },
    data: { crmStatus: status },
  });
  await audit({
    organizationId,
    actorUserId: me.id,
    action: "crm.status.change",
    resource: "organization",
    resourceId: organizationId,
    metadata: { from: existing.crmStatus, to: status },
  });

  revalidatePath(`/admin/organizations/${organizationId}`);
  revalidatePath("/admin/organizations");
  return { ok: true };
}

export async function setOrgCrmTagsAction(
  organizationId: string,
  tags: string[],
): Promise<ActionResult> {
  const me = await requireAdmin();
  const cleaned = safeTags(tags);
  await db.organization.update({
    where: { id: organizationId },
    data: { crmTags: cleaned },
  });
  await audit({
    organizationId,
    actorUserId: me.id,
    action: "crm.tags.update",
    resource: "organization",
    resourceId: organizationId,
    metadata: { tags: cleaned },
  });
  revalidatePath(`/admin/organizations/${organizationId}`);
  return { ok: true };
}
