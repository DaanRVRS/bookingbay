"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { audit } from "@/lib/audit/log";
import type { ActionResult } from "@/lib/auth/schemas";

const submitSchema = z
  .object({
    rating: z.number().int().min(0).max(5),
    comment: z.string().max(2000).default(""),
    source: z.enum(["signup-prompt", "voluntary", "other"]).default("voluntary"),
  })
  .refine((v) => v.rating > 0 || v.comment.trim().length > 0, {
    message: "Geef een rating of een toelichting",
    path: ["rating"],
  });

export type SubmitFeedbackInput = z.infer<typeof submitSchema>;

export async function submitFeedbackAction(
  input: SubmitFeedbackInput,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Ongeldige invoer";
    return { ok: false, error: first };
  }

  await db.userFeedback.create({
    data: {
      userId: user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment.trim() || null,
      source: parsed.data.source,
    },
  });
  await audit({
    actorUserId: user.id,
    action: "feedback.submit",
    resource: "user-feedback",
    metadata: { rating: parsed.data.rating, source: parsed.data.source },
  });

  // Mark the signup-prompt notification as read so it disappears from the bell.
  if (parsed.data.source === "signup-prompt") {
    await db.notification.updateMany({
      where: {
        userId: user.id,
        type: "feedback",
        readAt: null,
      },
      data: { readAt: new Date() },
    });
  }

  revalidatePath("/dashboard/notifications");
  revalidatePath("/admin/community/feedback");
  return { ok: true };
}

/**
 * Called lazily from the dashboard layout. If 5+ minutes have passed since
 * the user signed up AND they haven't been prompted yet, create a one-time
 * Notification asking for feedback. Idempotent — feedbackRequestedAt
 * gates against re-prompts.
 */
export async function maybeFireSignupFeedbackPrompt(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      createdAt: true,
      feedbackRequestedAt: true,
      memberships: { select: { id: true }, take: 1 },
    },
  });
  if (!user) return;
  if (user.feedbackRequestedAt) return;
  if (user.memberships.length === 0) return;
  const ageMs = Date.now() - user.createdAt.getTime();
  if (ageMs < 5 * 60 * 1000) return;

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { feedbackRequestedAt: new Date() },
    }),
    db.notification.create({
      data: {
        userId: user.id,
        type: "feedback",
        title: "Hoe bevalt BookingBay tot nu toe?",
        body:
          "Je bent net begonnen — we horen graag wat je van de eerste stappen vond. Twee minuten van je tijd, alles welkom.",
        ctaUrl: "/dashboard/feedback?source=signup-prompt",
        ctaLabel: "Geef feedback",
      },
    }),
  ]);
}
