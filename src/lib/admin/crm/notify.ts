import "server-only";
import { db } from "@/lib/db";
import { sendEmail, emailLayout, btn } from "@/lib/email";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit/log";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export interface CrmNotifySummary {
  remindersFanned: number;
  notificationsCreated: number;
  emailsSent: number;
  recipients: number;
}

/**
 * Daily reminder fan-out:
 * 1. For each due reminder where notifiedAt is null, create a Notification
 *    for the assignee (or for all platform admins if unassigned).
 * 2. Mark the reminder notifiedAt.
 * 3. Compose a single daily summary email with everything still open (due
 *    today + overdue) and send to all platform admins.
 *
 * Idempotent within a day: re-running won't create duplicate per-reminder
 * notifications because notifiedAt is set after the first run. The summary
 * email is, however, sent on every run — guard at the cron level (e.g.
 * trigger once per day).
 */
export async function runCrmNotifications(
  now: Date = new Date(),
): Promise<CrmNotifySummary> {
  const admins = await db.user.findMany({
    where: { isAdmin: true },
    select: { id: true, email: true, name: true },
  });
  if (admins.length === 0) {
    return {
      remindersFanned: 0,
      notificationsCreated: 0,
      emailsSent: 0,
      recipients: 0,
    };
  }

  // 1+2: per-reminder notifications
  const newlyDue = await db.orgReminder.findMany({
    where: { completedAt: null, dueAt: { lte: now }, notifiedAt: null },
    include: {
      organization: { select: { id: true, name: true, slug: true } },
    },
  });

  let notificationsCreated = 0;
  for (const r of newlyDue) {
    const recipients = r.assignedToUserId
      ? admins.filter((a) => a.id === r.assignedToUserId)
      : admins;
    if (recipients.length === 0) continue;

    const overdue = r.dueAt < now;
    const ctaUrl = `${env.APP_URL}/admin/organizations/${r.organizationId}`;

    await db.notification.createMany({
      data: recipients.map((a) => ({
        userId: a.id,
        organizationId: r.organizationId,
        type: "crm-reminder",
        title: overdue
          ? `Te laat: ${r.title}`
          : `Vandaag: ${r.title}`,
        body: `${r.organization.name}${r.notes ? `\n\n${r.notes}` : ""}`,
        ctaUrl,
        ctaLabel: "Open klant",
      })),
    });
    notificationsCreated += recipients.length;

    await db.orgReminder.update({
      where: { id: r.id },
      data: { notifiedAt: now },
    });

    await audit({
      organizationId: r.organizationId,
      action: "crm.reminder.notified",
      resource: "reminder",
      resourceId: r.id,
      metadata: {
        recipients: recipients.length,
        overdue,
      },
    });
  }

  // 3: daily summary email — covers everything still open
  const allOpen = await db.orgReminder.findMany({
    where: { completedAt: null, dueAt: { lte: now } },
    orderBy: { dueAt: "asc" },
    include: {
      organization: { select: { id: true, name: true, slug: true } },
      assignedTo: { select: { name: true, email: true } },
    },
  });

  let emailsSent = 0;
  if (allOpen.length > 0) {
    const summaryHtml = renderSummaryEmail(allOpen, now);
    const subject = `BookingBay CRM — ${allOpen.length} ${allOpen.length === 1 ? "follow-up" : "follow-ups"} open`;
    await Promise.all(
      admins.map(async (a) => {
        const r = await sendEmail({
          to: a.email,
          subject,
          html: summaryHtml,
          text: renderSummaryText(allOpen, now),
        });
        if (r.ok) emailsSent++;
      }),
    );
  }

  return {
    remindersFanned: newlyDue.length,
    notificationsCreated,
    emailsSent,
    recipients: admins.length,
  };
}

function renderSummaryEmail(
  reminders: Array<{
    id: string;
    title: string;
    notes: string | null;
    dueAt: Date;
    organization: { id: string; name: string };
    assignedTo: { name: string | null; email: string } | null;
  }>,
  now: Date,
): string {
  const rows = reminders
    .map((r) => {
      const overdue = r.dueAt < now;
      const dateLabel = format(r.dueAt, "EEE d MMM HH:mm", { locale: nl });
      const linkUrl = `${env.APP_URL}/admin/organizations/${r.organization.id}`;
      const assignee = r.assignedTo
        ? r.assignedTo.name ?? r.assignedTo.email
        : "—";
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e3e6ed">
            <div style="font-weight:600;font-size:14px;color:${overdue ? "#dc3a3a" : "#1a2238"}">
              ${overdue ? "🔴 " : ""}${escapeHtml(r.title)}
            </div>
            <div style="font-size:12px;color:#6b7280;margin-top:2px">
              <a href="${linkUrl}" style="color:#ef5934;text-decoration:none">${escapeHtml(r.organization.name)}</a>
              · ${escapeHtml(dateLabel)} · ${escapeHtml(assignee)}
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  return emailLayout(`
    <h1 style="margin:0 0 8px 0;font-size:20px;font-weight:600">CRM follow-ups</h1>
    <p style="margin:0 0 16px 0;font-size:14px;color:#6b7280">
      ${reminders.length} ${reminders.length === 1 ? "follow-up staat" : "follow-ups staan"} open vandaag.
    </p>
    <table style="border-collapse:collapse;width:100%;border:1px solid #e3e6ed;border-radius:8px;overflow:hidden">
      ${rows}
    </table>
    <div style="margin:24px 0">${btn(`${env.APP_URL}/admin`, "Open admin")}</div>
  `);
}

function renderSummaryText(
  reminders: Array<{
    title: string;
    dueAt: Date;
    organization: { name: string };
  }>,
  now: Date,
): string {
  const lines = reminders.map((r) => {
    const overdue = r.dueAt < now;
    const dateLabel = format(r.dueAt, "EEE d MMM HH:mm", { locale: nl });
    return `- ${overdue ? "[TE LAAT] " : ""}${r.title} — ${r.organization.name} (${dateLabel})`;
  });
  return [
    `BookingBay CRM follow-ups (${reminders.length})`,
    "",
    ...lines,
    "",
    `Open admin: ${env.APP_URL}/admin`,
  ].join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
