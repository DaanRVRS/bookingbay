"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth/session";
import { audit } from "@/lib/audit/log";
import type { ActionResult } from "@/lib/auth/schemas";
import { createPollSchema, voteSchema, type CreatePollInput, type VoteInput } from "./schemas";

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const p = i.path.join(".");
    if (!out[p]) out[p] = i.message;
  }
  return out;
}

export async function createPollAction(
  input: CreatePollInput,
): Promise<ActionResult<{ id: string }>> {
  const me = await requireAdmin();
  const parsed = createPollSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Ongeldige invoer",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const now = new Date();
  const poll = await db.poll.create({
    data: {
      title: parsed.data.title,
      question: parsed.data.question,
      options: parsed.data.options,
      allowMultiple: parsed.data.allowMultiple,
      status: parsed.data.publishNow ? "open" : "draft",
      publishedAt: parsed.data.publishNow ? now : null,
      createdById: me.id,
    },
    select: { id: true, status: true },
  });

  await audit({
    actorUserId: me.id,
    action: "poll.create",
    resource: "poll",
    resourceId: poll.id,
    metadata: { title: parsed.data.title, status: poll.status },
  });

  if (poll.status === "open") {
    await fanOutPollNotification(poll.id, parsed.data.title, parsed.data.question);
  }

  revalidatePath("/admin/community/polls");
  return { ok: true, data: { id: poll.id } };
}

export async function publishPollAction(id: string): Promise<ActionResult> {
  const me = await requireAdmin();
  const existing = await db.poll.findUnique({
    where: { id },
    select: { id: true, status: true, title: true, question: true },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };
  if (existing.status !== "draft") {
    return { ok: false, error: "Poll is al gepubliceerd" };
  }

  await db.poll.update({
    where: { id },
    data: { status: "open", publishedAt: new Date() },
  });
  await audit({
    actorUserId: me.id,
    action: "poll.publish",
    resource: "poll",
    resourceId: id,
  });
  await fanOutPollNotification(id, existing.title, existing.question);

  revalidatePath("/admin/community/polls");
  revalidatePath(`/admin/community/polls/${id}`);
  return { ok: true };
}

export async function closePollAction(id: string): Promise<ActionResult> {
  const me = await requireAdmin();
  const existing = await db.poll.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };
  if (existing.status === "closed") return { ok: true };

  await db.poll.update({
    where: { id },
    data: { status: "closed", closedAt: new Date() },
  });
  await audit({
    actorUserId: me.id,
    action: "poll.close",
    resource: "poll",
    resourceId: id,
  });

  revalidatePath("/admin/community/polls");
  revalidatePath(`/admin/community/polls/${id}`);
  return { ok: true };
}

export async function deletePollAction(id: string): Promise<ActionResult> {
  const me = await requireAdmin();
  const existing = await db.poll.findUnique({
    where: { id },
    select: { id: true, title: true },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };

  await db.poll.delete({ where: { id } });
  // Clean up any pending bell-notifications for this poll.
  await db.notification.deleteMany({
    where: { type: "poll", ctaUrl: `/dashboard/polls/${id}` },
  });
  await audit({
    actorUserId: me.id,
    action: "poll.delete",
    resource: "poll",
    resourceId: id,
    metadata: { title: existing.title },
  });

  revalidatePath("/admin/community/polls");
  return { ok: true };
}

export async function voteOnPollAction(input: VoteInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = voteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Ongeldige invoer",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const poll = await db.poll.findUnique({
    where: { id: parsed.data.pollId },
    select: { id: true, status: true, options: true, allowMultiple: true },
  });
  if (!poll) return { ok: false, error: "Poll niet gevonden" };
  if (poll.status !== "open") {
    return { ok: false, error: "Deze poll staat niet meer open" };
  }

  const options = Array.isArray(poll.options) ? (poll.options as unknown[]) : [];
  const choices = parsed.data.optionIndices.filter(
    (i) => i >= 0 && i < options.length,
  );
  if (choices.length === 0) return { ok: false, error: "Kies een optie" };
  if (!poll.allowMultiple && choices.length > 1) {
    return { ok: false, error: "Deze poll laat maar één antwoord toe" };
  }

  // Upsert — one vote per (poll, user). Re-voting overwrites.
  await db.pollVote.upsert({
    where: { pollId_userId: { pollId: poll.id, userId: user.id } },
    create: {
      pollId: poll.id,
      userId: user.id,
      optionIndices: choices,
    },
    update: { optionIndices: choices },
  });

  // Mark the bell-notification for this poll as read for this user.
  await db.notification.updateMany({
    where: {
      userId: user.id,
      type: "poll",
      ctaUrl: `/dashboard/polls/${poll.id}`,
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  await audit({
    actorUserId: user.id,
    action: "poll.vote",
    resource: "poll",
    resourceId: poll.id,
    metadata: { choices },
  });

  revalidatePath(`/dashboard/polls/${poll.id}`);
  revalidatePath("/dashboard/notifications");
  revalidatePath(`/admin/community/polls/${poll.id}`);
  return { ok: true };
}

async function fanOutPollNotification(
  pollId: string,
  title: string,
  question: string,
) {
  const recipients = await db.user.findMany({
    where: { memberships: { some: {} } },
    select: { id: true },
  });
  if (recipients.length === 0) return;
  const trimmedQuestion =
    question.length > 200 ? question.slice(0, 200) + "…" : question;
  await db.notification.createMany({
    data: recipients.map((r) => ({
      userId: r.id,
      type: "poll",
      title: `Nieuwe poll: ${title}`,
      body: trimmedQuestion,
      ctaUrl: `/dashboard/polls/${pollId}`,
      ctaLabel: "Stem",
    })),
  });
}
