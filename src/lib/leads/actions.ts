"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { sendEmail, emailLayout } from "@/lib/email";
import type { ActionResult } from "@/lib/auth/schemas";

export const leadSchema = z.object({
  organizationId: z.string().min(1),
  itemId: z.string().optional().or(z.literal("")),
  name: z.string().min(2, "Naam te kort").max(120),
  email: z.email("Ongeldig e-mailadres"),
  phone: z.string().max(40).optional().or(z.literal("")),
  message: z.string().min(5, "Bericht te kort").max(2000),
  startAt: z.string().optional().or(z.literal("")),
  endAt: z.string().optional().or(z.literal("")),
});

export type LeadInput = z.infer<typeof leadSchema>;

export async function createLeadAction(input: LeadInput): Promise<ActionResult> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const path = i.path.join(".");
      if (!fields[path]) fields[path] = i.message;
    }
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fields };
  }

  const org = await db.organization.findUnique({
    where: { id: parsed.data.organizationId },
    select: { id: true, name: true, slug: true, contactEmail: true },
  });
  if (!org) return { ok: false, error: "Organisatie niet gevonden" };

  let itemRef: { id: string; name: string } | null = null;
  if (parsed.data.itemId) {
    const found = await db.item.findFirst({
      where: { id: parsed.data.itemId, organizationId: org.id },
      select: { id: true, name: true },
    });
    if (found) itemRef = found;
  }

  const startAt = parsed.data.startAt ? new Date(parsed.data.startAt) : null;
  const endAt = parsed.data.endAt ? new Date(parsed.data.endAt) : null;

  const lead = await db.lead.create({
    data: {
      organizationId: org.id,
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone || null,
      message: parsed.data.message,
      itemId: itemRef?.id ?? null,
      startAt: startAt && !Number.isNaN(startAt.getTime()) ? startAt : null,
      endAt: endAt && !Number.isNaN(endAt.getTime()) ? endAt : null,
    },
    select: { id: true },
  });

  // Notify the organization owner via the configured contact email
  const recipient = org.contactEmail;
  if (recipient) {
    const escape = (s: string) =>
      s.replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c),
      );

    const detailRows: string[] = [];
    if (parsed.data.phone) detailRows.push(`<tr><td>Telefoon</td><td>${escape(parsed.data.phone)}</td></tr>`);
    if (itemRef) detailRows.push(`<tr><td>Item</td><td>${escape(itemRef.name)}</td></tr>`);
    if (startAt) detailRows.push(`<tr><td>Gewenste start</td><td>${startAt.toLocaleString("nl-NL")}</td></tr>`);
    if (endAt) detailRows.push(`<tr><td>Tot</td><td>${endAt.toLocaleString("nl-NL")}</td></tr>`);

    await sendEmail({
      to: recipient,
      subject: `Nieuwe aanvraag van ${parsed.data.name} — ${org.name}`,
      html: emailLayout(`
        <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600">Nieuwe aanvraag</h1>
        <p style="margin:0 0 8px 0">Iemand stuurde een aanvraag via je BookingBay-site.</p>
        <p style="margin:0 0 16px 0">
          <strong>${escape(parsed.data.name)}</strong><br>
          <a href="mailto:${escape(parsed.data.email)}" style="color:#ef5934">${escape(parsed.data.email)}</a>
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 16px 0">
          ${detailRows.join("")}
        </table>
        <div style="background:#f5f3ee;border-radius:8px;padding:14px 16px;margin:0 0 24px 0;white-space:pre-wrap">${escape(parsed.data.message)}</div>
        <p style="font-size:12px;color:#6b7280">
          Gelogd in je dashboard onder Leads. Lead-id: <code>${lead.id}</code>
        </p>
      `),
      text: `Nieuwe aanvraag van ${parsed.data.name} (${parsed.data.email})\n\n${parsed.data.message}`,
    });
  }

  return { ok: true };
}
