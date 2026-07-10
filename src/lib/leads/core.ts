import "server-only";
import { db } from "@/lib/db";
import { sendEmail, emailLayout } from "@/lib/email";
import type { ActionResult } from "@/lib/auth/schemas";
import { leadSchema, type LeadInput } from "./schemas";
import { isEmailBlocked } from "./blocklist";
import { audit } from "@/lib/audit/log";
import { notifyNewLead } from "@/lib/discord/notifications";

/**
 * Kern van de lead-/contactformulier-verwerking. Los van "use server" zodat
 * zowel de (interne) Server Action als de publieke API-route
 * (/api/public/lead) 'm kunnen aanroepen. De publieke contact-widget draait
 * bewust via de API-route i.p.v. een Server Action — action-id's wijzigen bij
 * een deploy, wat een op een externe site ingebedde iframe zou breken.
 */
export async function submitLead(input: LeadInput): Promise<ActionResult> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const path = i.path.join(".");
      if (!fields[path]) fields[path] = i.message;
    }
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fields };
  }

  // Honeypot trip — silently fake success so bots don't learn it's blocked
  if (parsed.data.website && parsed.data.website.trim().length > 0) {
    return { ok: true };
  }

  const org = await db.organization.findUnique({
    where: { id: parsed.data.organizationId },
    select: { id: true, name: true, slug: true, contactEmail: true },
  });
  if (!org) return { ok: false, error: "Organisatie niet gevonden" };

  // Per-org blocklist (specific address or @domain). Silent fake-success.
  if (await isEmailBlocked(org.id, parsed.data.email)) {
    return { ok: true };
  }

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

  await audit({
    organizationId: org.id,
    action: "lead.create",
    resource: "lead",
    resourceId: lead.id,
    metadata: { name: parsed.data.name, email: parsed.data.email.toLowerCase() },
  });

  await notifyNewLead({
    leadId: lead.id,
    orgName: org.name,
    orgSlug: org.slug,
    customerName: parsed.data.name,
    customerEmail: parsed.data.email.toLowerCase(),
    message: parsed.data.message,
    itemName: itemRef?.name ?? null,
  });

  // Fan-out bell-notification to org-OWNERS/ADMINS — so the lead pops up in
  // hun notification-bell, niet alleen in de configured contactEmail-inbox.
  const orgAdmins = await db.membership.findMany({
    where: {
      organizationId: org.id,
      role: { in: ["OWNER", "ADMIN", "MANAGER"] },
    },
    select: { userId: true },
  });
  if (orgAdmins.length > 0) {
    const bodyPreview =
      parsed.data.message.length > 200
        ? parsed.data.message.slice(0, 200) + "…"
        : parsed.data.message;
    await db.notification.createMany({
      data: orgAdmins.map((m) => ({
        userId: m.userId,
        organizationId: org.id,
        type: "lead",
        title: `Nieuwe lead: ${parsed.data.name}`,
        body: itemRef ? `${itemRef.name} · ${bodyPreview}` : bodyPreview,
        ctaUrl: "/dashboard/leads",
        ctaLabel: "Open leads",
      })),
    });
  }

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
