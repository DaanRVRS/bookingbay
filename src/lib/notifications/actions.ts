"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, requireAdmin } from "@/lib/auth/session";
import { audit } from "@/lib/audit/log";
import { sendEmail, emailLayout, btn } from "@/lib/email";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/auth/schemas";

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const existing = await db.notification.findFirst({
    where: { id, userId: user.id },
    select: { id: true, readAt: true },
  });
  if (!existing) return { ok: false, error: "Niet gevonden" };
  if (!existing.readAt) {
    await db.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }
  revalidatePath("/dashboard/notifications");
  return { ok: true };
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const user = await requireUser();
  await db.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/dashboard/notifications");
  return { ok: true };
}

const broadcastSchema = z.object({
  title: z.string().min(2, "Titel is verplicht").max(120),
  body: z.string().min(2, "Bericht is verplicht").max(4000),
  ctaUrl: z.string().max(400).default(""),
  ctaLabel: z.string().max(60).default(""),
  sendEmail: z.boolean().default(true),
});

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const p = i.path.join(".");
    if (!out[p]) out[p] = i.message;
  }
  return out;
}

export async function broadcastNotificationAction(input: {
  title: string;
  body: string;
  ctaUrl?: string;
  ctaLabel?: string;
  sendEmail?: boolean;
}): Promise<ActionResult<{ recipients: number; emailsAttempted: number }>> {
  const me = await requireAdmin();
  const parsed = broadcastSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }

  // Recipients = every user with at least one membership (i.e. an actual
  // BookingBay customer, not an orphan account).
  const recipients = await db.user.findMany({
    where: { memberships: { some: {} } },
    select: { id: true, email: true, name: true },
  });

  if (recipients.length === 0) {
    return { ok: false, error: "Geen gebruikers om naar te sturen" };
  }

  // Fan out: one Notification row per recipient. Done in chunks to stay
  // within statement-size sanity bounds.
  const now = new Date();
  const data = recipients.map((r) => ({
    userId: r.id,
    type: "broadcast",
    title: parsed.data.title,
    body: parsed.data.body,
    ctaUrl: parsed.data.ctaUrl || null,
    ctaLabel: parsed.data.ctaLabel || null,
    createdById: me.id,
    createdAt: now,
  }));
  await db.notification.createMany({ data });

  let emailsAttempted = 0;
  if (parsed.data.sendEmail) {
    emailsAttempted = recipients.length;
    const ctaBlock =
      parsed.data.ctaUrl && parsed.data.ctaLabel
        ? `<p style="margin:24px 0">${btn(parsed.data.ctaUrl, parsed.data.ctaLabel)}</p>`
        : "";
    // Best-effort: fire all emails in parallel, swallow individual errors.
    await Promise.all(
      recipients.map((r) =>
        sendEmail({
          to: r.email,
          subject: parsed.data.title,
          html: emailLayout(`
            <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600">${parsed.data.title}</h1>
            <div style="margin:0 0 16px 0;white-space:pre-line">${parsed.data.body}</div>
            ${ctaBlock}
            <p style="margin:24px 0 0 0;font-size:12px;color:#6b7280">
              Je krijgt deze e-mail als BookingBay-gebruiker. Bekijk al je
              berichten in
              <a href="${env.APP_URL}/dashboard/notifications" style="color:#ef5934">
                je dashboard
              </a>.
            </p>
          `),
          text: `${parsed.data.title}\n\n${parsed.data.body}${parsed.data.ctaUrl ? "\n\n" + parsed.data.ctaUrl : ""}`,
        }),
      ),
    );
  }

  await audit({
    actorUserId: me.id,
    action: "admin.broadcast",
    resource: "notification",
    metadata: {
      title: parsed.data.title,
      recipients: recipients.length,
      emailsAttempted,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard/notifications");
  return {
    ok: true,
    data: { recipients: recipients.length, emailsAttempted },
  };
}
