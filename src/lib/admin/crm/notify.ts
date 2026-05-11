import "server-only";
import { db } from "@/lib/db";
import { sendEmail, emailLayout, btn } from "@/lib/email";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit/log";
import { notifyReminderDue } from "@/lib/discord/notifications";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export interface CrmNotifySummary {
  orgRemindersFanned: number;
  prospectRemindersFanned: number;
  notificationsCreated: number;
  emailsSent: number;
  recipients: number;
}

interface SummaryRow {
  title: string;
  dueAt: Date;
  url: string;
  contextLabel: string; // org name or prospect name/company
  assigneeLabel: string;
}

/**
 * Daily reminder fan-out (orgs + prospects):
 * 1. For each due reminder where notifiedAt is null, create a Notification
 *    for the assignee (or for all platform admins if unassigned).
 * 2. Mark the reminder notifiedAt.
 * 3. Compose a single daily summary email with everything still open and
 *    send it to all platform admins.
 *
 * Idempotent: notifiedAt prevents duplicate per-reminder fan-outs. Summary
 * email is sent on every run — trigger once per day from cron.
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
      orgRemindersFanned: 0,
      prospectRemindersFanned: 0,
      notificationsCreated: 0,
      emailsSent: 0,
      recipients: 0,
    };
  }

  let notificationsCreated = 0;

  // ----- Org reminders fan-out -----
  const newlyDueOrg = await db.orgReminder.findMany({
    where: { completedAt: null, dueAt: { lte: now }, notifiedAt: null },
    include: {
      organization: { select: { id: true, name: true, slug: true } },
    },
  });

  for (const r of newlyDueOrg) {
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
        title: overdue ? `Te laat: ${r.title}` : `Vandaag: ${r.title}`,
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
      metadata: { recipients: recipients.length, overdue },
    });
    await notifyReminderDue({
      kind: "org",
      reminderId: r.id,
      title: r.title,
      notes: r.notes,
      dueAt: r.dueAt,
      overdue,
      contextLabel: `Klant · ${r.organization.name}`,
      contextUrl: ctaUrl,
      assigneeLabel: null,
    });
  }

  // ----- Prospect reminders fan-out -----
  const newlyDueProspect = await db.prospectReminder.findMany({
    where: { completedAt: null, dueAt: { lte: now }, notifiedAt: null },
    include: {
      prospect: { select: { id: true, name: true, companyName: true } },
    },
  });

  for (const r of newlyDueProspect) {
    const recipients = r.assignedToUserId
      ? admins.filter((a) => a.id === r.assignedToUserId)
      : admins;
    if (recipients.length === 0) continue;
    const overdue = r.dueAt < now;
    const ctaUrl = `${env.APP_URL}/admin/crm/${r.prospectId}`;
    const contextLabel =
      r.prospect.companyName
        ? `${r.prospect.name} (${r.prospect.companyName})`
        : r.prospect.name;
    await db.notification.createMany({
      data: recipients.map((a) => ({
        userId: a.id,
        type: "crm-reminder",
        title: overdue ? `Te laat: ${r.title}` : `Vandaag: ${r.title}`,
        body: `Prospect ${contextLabel}${r.notes ? `\n\n${r.notes}` : ""}`,
        ctaUrl,
        ctaLabel: "Open prospect",
      })),
    });
    notificationsCreated += recipients.length;
    await db.prospectReminder.update({
      where: { id: r.id },
      data: { notifiedAt: now },
    });
    await audit({
      action: "prospect.reminder.notified",
      resource: "prospect-reminder",
      resourceId: r.id,
      metadata: { recipients: recipients.length, overdue },
    });
    await notifyReminderDue({
      kind: "prospect",
      reminderId: r.id,
      title: r.title,
      notes: r.notes,
      dueAt: r.dueAt,
      overdue,
      contextLabel: `Prospect · ${contextLabel}`,
      contextUrl: ctaUrl,
      assigneeLabel: null,
    });
  }

  // ----- Daily summary email (orgs + prospects combined) -----
  const [allOpenOrg, allOpenProspect] = await Promise.all([
    db.orgReminder.findMany({
      where: { completedAt: null, dueAt: { lte: now } },
      orderBy: { dueAt: "asc" },
      include: {
        organization: { select: { id: true, name: true } },
        assignedTo: { select: { name: true, email: true } },
      },
    }),
    db.prospectReminder.findMany({
      where: { completedAt: null, dueAt: { lte: now } },
      orderBy: { dueAt: "asc" },
      include: {
        prospect: { select: { id: true, name: true, companyName: true } },
        assignedTo: { select: { name: true, email: true } },
      },
    }),
  ]);

  const rows: SummaryRow[] = [
    ...allOpenOrg.map<SummaryRow>((r) => ({
      title: r.title,
      dueAt: r.dueAt,
      url: `${env.APP_URL}/admin/organizations/${r.organization.id}`,
      contextLabel: `Klant · ${r.organization.name}`,
      assigneeLabel: r.assignedTo
        ? r.assignedTo.name ?? r.assignedTo.email
        : "—",
    })),
    ...allOpenProspect.map<SummaryRow>((r) => ({
      title: r.title,
      dueAt: r.dueAt,
      url: `${env.APP_URL}/admin/crm/${r.prospect.id}`,
      contextLabel: `Prospect · ${r.prospect.companyName ?? r.prospect.name}`,
      assigneeLabel: r.assignedTo
        ? r.assignedTo.name ?? r.assignedTo.email
        : "—",
    })),
  ].sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());

  let emailsSent = 0;
  if (rows.length > 0) {
    const summaryHtml = renderSummaryEmail(rows, now);
    const subject = `BookingBay CRM — ${rows.length} ${rows.length === 1 ? "follow-up" : "follow-ups"} open`;
    await Promise.all(
      admins.map(async (a) => {
        const r = await sendEmail({
          to: a.email,
          subject,
          html: summaryHtml,
          text: renderSummaryText(rows, now),
        });
        if (r.ok) emailsSent++;
      }),
    );
  }

  return {
    orgRemindersFanned: newlyDueOrg.length,
    prospectRemindersFanned: newlyDueProspect.length,
    notificationsCreated,
    emailsSent,
    recipients: admins.length,
  };
}

function renderSummaryEmail(rows: SummaryRow[], now: Date): string {
  const tableRows = rows
    .map((r) => {
      const overdue = r.dueAt < now;
      const dateLabel = format(r.dueAt, "EEE d MMM HH:mm", { locale: nl });
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e3e6ed">
            <div style="font-weight:600;font-size:14px;color:${overdue ? "#dc3a3a" : "#1a2238"}">
              ${overdue ? "🔴 " : ""}${escapeHtml(r.title)}
            </div>
            <div style="font-size:12px;color:#6b7280;margin-top:2px">
              <a href="${r.url}" style="color:#ef5934;text-decoration:none">${escapeHtml(r.contextLabel)}</a>
              · ${escapeHtml(dateLabel)} · ${escapeHtml(r.assigneeLabel)}
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  return emailLayout(`
    <h1 style="margin:0 0 8px 0;font-size:20px;font-weight:600">CRM follow-ups</h1>
    <p style="margin:0 0 16px 0;font-size:14px;color:#6b7280">
      ${rows.length} ${rows.length === 1 ? "follow-up staat" : "follow-ups staan"} open vandaag (klanten + prospects).
    </p>
    <table style="border-collapse:collapse;width:100%;border:1px solid #e3e6ed;border-radius:8px;overflow:hidden">
      ${tableRows}
    </table>
    <div style="margin:24px 0">${btn(`${env.APP_URL}/admin`, "Open admin")}</div>
  `);
}

function renderSummaryText(rows: SummaryRow[], now: Date): string {
  const lines = rows.map((r) => {
    const overdue = r.dueAt < now;
    const dateLabel = format(r.dueAt, "EEE d MMM HH:mm", { locale: nl });
    return `- ${overdue ? "[TE LAAT] " : ""}${r.title} — ${r.contextLabel} (${dateLabel})`;
  });
  return [
    `BookingBay CRM follow-ups (${rows.length})`,
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
