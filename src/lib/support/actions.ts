"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOrg, requireAdmin, requireUser } from "@/lib/auth/session";
import { audit } from "@/lib/audit/log";
import { sendEmail, emailLayout, btn } from "@/lib/email";
import { env } from "@/lib/env";
import {
  notifyNewSupportTicket,
  notifyTicketReply,
} from "@/lib/discord/notifications";
import type { ActionResult } from "@/lib/auth/schemas";
import {
  adminUpdateTicketSchema,
  createTicketSchema,
  replyTicketSchema,
  type AdminUpdateTicketInput,
  type CreateTicketInput,
  type ReplyTicketInput,
} from "./schemas";

function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!fields[path]) fields[path] = issue.message;
  }
  return fields;
}

const SUPPORT_NOTIFY_EMAIL = "hallo@bookingbay.nl";

export async function createTicketAction(
  input: CreateTicketInput,
): Promise<ActionResult<{ ticketId: string }>> {
  const ctx = await requireOrg();
  const parsed = createTicketSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Ongeldige invoer",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const ticket = await db.$transaction(async (tx) => {
    const t = await tx.supportTicket.create({
      data: {
        organizationId: ctx.organization.id,
        createdById: ctx.user.id,
        subject: parsed.data.subject,
        category: parsed.data.category,
        priority: parsed.data.priority,
        status: "AWAITING_SUPPORT",
        lastUserReplyAt: new Date(),
      },
      select: { id: true },
    });
    await tx.supportTicketMessage.create({
      data: {
        ticketId: t.id,
        authorUserId: ctx.user.id,
        isStaff: false,
        body: parsed.data.body,
      },
    });
    return t;
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "support.ticket.create",
    resource: "support-ticket",
    resourceId: ticket.id,
    metadata: {
      subject: parsed.data.subject,
      category: parsed.data.category,
      priority: parsed.data.priority,
    },
  });

  // Notify BookingBay via Discord + e-mail (best-effort, never blocks).
  await notifyNewSupportTicket({
    ticketId: ticket.id,
    subject: parsed.data.subject,
    body: parsed.data.body,
    category: parsed.data.category,
    priority: parsed.data.priority,
    orgName: ctx.organization.name,
    authorName: ctx.user.name,
    authorEmail: ctx.user.email,
  });

  await sendEmail({
    to: SUPPORT_NOTIFY_EMAIL,
    subject: `[Ticket] ${parsed.data.subject} — ${ctx.organization.name}`,
    html: emailLayout(`
      <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600">Nieuwe support-ticket</h1>
      <p style="margin:0 0 8px 0">
        <strong>${escapeHtml(ctx.organization.name)}</strong> · ${escapeHtml(ctx.user.email)}
      </p>
      <p style="margin:0 0 4px 0;font-size:13px;color:#6b7280">
        Categorie: ${escapeHtml(parsed.data.category)} · Prioriteit: ${parsed.data.priority}
      </p>
      <div style="background:#f5f3ee;border-radius:8px;padding:14px 16px;margin:16px 0;white-space:pre-wrap">
        ${escapeHtml(parsed.data.body)}
      </div>
      <p style="margin:24px 0">${btn(
        `${env.APP_URL}/admin/support/${ticket.id}`,
        "Bekijk ticket",
      )}</p>
    `),
    text: `Nieuwe ticket van ${ctx.organization.name} (${ctx.user.email})\n\nOnderwerp: ${parsed.data.subject}\n\n${parsed.data.body}`,
  });

  // Confirmation mail to the user who opened it.
  if (ctx.user.email) {
    await sendEmail({
      to: ctx.user.email,
      subject: `We hebben je ticket ontvangen — ${parsed.data.subject}`,
      html: emailLayout(`
        <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600">Ticket aangemaakt</h1>
        <p>Bedankt, we hebben je bericht ontvangen en reageren meestal binnen één werkdag.</p>
        <p style="margin:16px 0 4px 0;font-size:13px;color:#6b7280">Jouw onderwerp:</p>
        <p style="margin:0 0 16px 0;font-weight:600">${escapeHtml(parsed.data.subject)}</p>
        <p style="margin:24px 0">${btn(
          `${env.APP_URL}/dashboard/support/${ticket.id}`,
          "Bekijk je ticket",
        )}</p>
      `),
      text: `We hebben je ticket "${parsed.data.subject}" ontvangen — we reageren meestal binnen één werkdag.\n\n${env.APP_URL}/dashboard/support/${ticket.id}`,
    });
  }

  revalidatePath("/dashboard/support");
  revalidatePath("/admin/support");
  return { ok: true, data: { ticketId: ticket.id } };
}

export async function replyTicketAction(
  input: ReplyTicketInput,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = replyTicketSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Ongeldige invoer",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const ticket = await db.supportTicket.findUnique({
    where: { id: parsed.data.ticketId },
    include: {
      organization: { select: { id: true, name: true } },
      createdBy: { select: { id: true, email: true, name: true } },
    },
  });
  if (!ticket) return { ok: false, error: "Ticket niet gevonden" };
  if (ticket.status === "CLOSED") {
    return { ok: false, error: "Deze ticket is gesloten" };
  }

  // Authorization: either an admin (staff reply) or a member of the org.
  let isStaff = !!user.isAdmin;
  if (!isStaff) {
    const member = await db.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: ticket.organizationId,
        },
      },
      select: { id: true },
    });
    if (!member) return { ok: false, error: "Geen toegang tot deze ticket" };
  }

  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.supportTicketMessage.create({
      data: {
        ticketId: ticket.id,
        authorUserId: user.id,
        isStaff,
        body: parsed.data.body,
      },
    });
    await tx.supportTicket.update({
      where: { id: ticket.id },
      data: {
        lastMessageAt: now,
        ...(isStaff
          ? {
              status: "AWAITING_USER",
              lastStaffReplyAt: now,
            }
          : {
              status: "AWAITING_SUPPORT",
              lastUserReplyAt: now,
            }),
      },
    });
  });

  await audit({
    organizationId: ticket.organizationId,
    actorUserId: user.id,
    action: isStaff ? "support.ticket.reply.staff" : "support.ticket.reply.user",
    resource: "support-ticket",
    resourceId: ticket.id,
  });

  await notifyTicketReply({
    ticketId: ticket.id,
    subject: ticket.subject,
    body: parsed.data.body,
    orgName: ticket.organization.name,
    authorName: user.name,
    authorEmail: user.email,
    isStaff,
  });

  // E-mail the other party.
  if (isStaff && ticket.createdBy?.email) {
    await sendEmail({
      to: ticket.createdBy.email,
      subject: `Antwoord op je ticket — ${ticket.subject}`,
      html: emailLayout(`
        <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600">Reactie van BookingBay</h1>
        <p>Er is een nieuwe reactie op je ticket binnengekomen.</p>
        <div style="background:#f5f3ee;border-radius:8px;padding:14px 16px;margin:16px 0;white-space:pre-wrap">
          ${escapeHtml(parsed.data.body)}
        </div>
        <p style="margin:24px 0">${btn(
          `${env.APP_URL}/dashboard/support/${ticket.id}`,
          "Open ticket",
        )}</p>
      `),
      text: `Reactie op je ticket "${ticket.subject}":\n\n${parsed.data.body}\n\n${env.APP_URL}/dashboard/support/${ticket.id}`,
    });
  } else if (!isStaff) {
    await sendEmail({
      to: SUPPORT_NOTIFY_EMAIL,
      subject: `[Ticket-reply] ${ticket.subject} — ${ticket.organization.name}`,
      html: emailLayout(`
        <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600">Nieuwe reactie op ticket</h1>
        <p style="margin:0 0 8px 0">
          <strong>${escapeHtml(ticket.organization.name)}</strong> · ${escapeHtml(user.email)}
        </p>
        <div style="background:#f5f3ee;border-radius:8px;padding:14px 16px;margin:16px 0;white-space:pre-wrap">
          ${escapeHtml(parsed.data.body)}
        </div>
        <p style="margin:24px 0">${btn(
          `${env.APP_URL}/admin/support/${ticket.id}`,
          "Bekijk ticket",
        )}</p>
      `),
      text: `Reactie op ticket "${ticket.subject}" van ${ticket.organization.name}:\n\n${parsed.data.body}`,
    });
  }

  revalidatePath(`/dashboard/support/${ticket.id}`);
  revalidatePath("/dashboard/support");
  revalidatePath(`/admin/support/${ticket.id}`);
  revalidatePath("/admin/support");
  return { ok: true };
}

export async function adminUpdateTicketAction(
  input: AdminUpdateTicketInput,
): Promise<ActionResult> {
  const me = await requireAdmin();
  const parsed = adminUpdateTicketSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Ongeldige invoer",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const ticket = await db.supportTicket.findUnique({
    where: { id: parsed.data.ticketId },
    select: { id: true, status: true, organizationId: true },
  });
  if (!ticket) return { ok: false, error: "Ticket niet gevonden" };

  const data: Record<string, unknown> = {};
  if (parsed.data.priority) data.priority = parsed.data.priority;
  if (parsed.data.status) {
    data.status = parsed.data.status;
    if (parsed.data.status === "CLOSED" || parsed.data.status === "RESOLVED") {
      data.closedAt = new Date();
    } else {
      data.closedAt = null;
    }
  }

  await db.supportTicket.update({ where: { id: ticket.id }, data });
  await audit({
    organizationId: ticket.organizationId,
    actorUserId: me.id,
    action: "support.ticket.update",
    resource: "support-ticket",
    resourceId: ticket.id,
    metadata: parsed.data,
  });

  revalidatePath(`/admin/support/${ticket.id}`);
  revalidatePath("/admin/support");
  revalidatePath(`/dashboard/support/${ticket.id}`);
  return { ok: true };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c),
  );
}
