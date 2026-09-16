"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { COMPANY } from "@/lib/company";
import { audit } from "@/lib/audit/log";
import { sendEmail, emailLayout, escapeHtml, btn } from "@/lib/email";
import {
  clientIpFromHeaders,
  consumeRateLimit,
  PUBLIC_FORM_IP_LIMIT,
  tooManyAttemptsMessage,
} from "@/lib/security/rate-limit";

const schema = z.object({
  url: z
    .string()
    .trim()
    .max(500)
    .refine((v) => /^https?:\/\/\S+$/i.test(v), "Vul de volledige link in (begint met http:// of https://)"),
  description: z
    .string()
    .trim()
    .min(20, "Omschrijf in minimaal 20 tekens wat er niet klopt en waarom")
    .max(4000),
  reporterName: z.string().trim().max(120).default(""),
  reporterEmail: z.email("Ongeldig e-mailadres").max(200).or(z.literal("")),
  goodFaith: z.literal(true, { error: "Bevestig dat je de melding te goeder trouw doet" }),
  /** Slug van de klantsite als de melder via de footer-link kwam. */
  site: z.string().trim().max(60).default(""),
  // Honeypot — altijd leeg bij echte mensen.
  website: z.string().max(0).optional().default(""),
});

export type ContentReportInput = z.input<typeof schema>;

export type ContentReportResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Probeert de gemelde URL of de meegegeven site-slug aan een organisatie
 * te koppelen (subdomein op TENANT_DOMAIN of geverifieerd custom-domein).
 */
async function resolveOrganization(url: string, site: string) {
  if (site && /^[a-z0-9-]+$/i.test(site)) {
    const bySlug = await db.organization.findUnique({
      where: { slug: site.toLowerCase() },
      select: { id: true, name: true, slug: true },
    });
    if (bySlug) return bySlug;
  }
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  const tenantSuffix = `.${env.TENANT_DOMAIN.split(":")[0].toLowerCase()}`;
  if (host.endsWith(tenantSuffix)) {
    const slug = host.slice(0, -tenantSuffix.length).split(".")[0];
    if (slug && slug !== "www") {
      const org = await db.organization.findUnique({
        where: { slug },
        select: { id: true, name: true, slug: true },
      });
      if (org) return org;
    }
  }
  return db.organization.findFirst({
    where: { customDomain: host, customDomainVerifiedAt: { not: null } },
    select: { id: true, name: true, slug: true },
  });
}

export async function submitContentReportAction(
  input: ContentReportInput,
): Promise<ContentReportResult> {
  const h = await headers();
  const ip = clientIpFromHeaders(h);
  const gate = await consumeRateLimit(`report:ip:${ip}`, PUBLIC_FORM_IP_LIMIT);
  if (gate.limited) {
    return { ok: false, error: tooManyAttemptsMessage(gate.retryAfterSec) };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const p = i.path.join(".");
      if (!fieldErrors[p]) fieldErrors[p] = i.message;
    }
    return { ok: false, error: "Controleer de invoer", fieldErrors };
  }
  // Honeypot: stil "succes" zodat bots niets leren.
  if (parsed.data.website) return { ok: true };

  const { url, description, reporterName, reporterEmail, site } = parsed.data;
  const org = await resolveOrganization(url, site);
  const receivedAt = new Date();
  const reference = `M-${receivedAt.toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;

  await audit({
    organizationId: org?.id ?? null,
    action: "content-report.received",
    resource: "content-report",
    resourceId: reference,
    metadata: { url, hasContact: Boolean(reporterEmail), site: org?.slug ?? null },
  });

  // Interne melding voor alle platform-beheerders (dashboard-bel).
  const admins = await db.user.findMany({
    where: { isAdmin: true },
    select: { id: true },
  });
  if (admins.length > 0) {
    const excerpt = description.length > 300 ? `${description.slice(0, 300)}…` : description;
    await db.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        organizationId: org?.id ?? null,
        type: "content-report",
        title: `Melding ${reference}${org ? ` over ${org.name}` : ""}`,
        body: `${url}\n\n${excerpt}${
          reporterEmail ? `\n\nMelder: ${reporterName || "onbekend"} <${reporterEmail}>` : "\n\nMelder: anoniem"
        }`,
        ctaUrl: org ? `/admin/organizations/${org.id}` : "/admin",
        ctaLabel: org ? "Open organisatie" : "Open admin",
      })),
    });
  }

  // Volledige melding naar het contactpunt (DSA art. 11/16).
  await sendEmail({
    to: COMPANY.email,
    subject: `[Melding ${reference}] Inhoud${org ? ` op ${org.name}` : ""}`,
    html: emailLayout(`
      <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600">Melding over inhoud</h1>
      <table style="border-collapse:collapse;font-size:14px;margin:0 0 16px 0">
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Kenmerk</td><td style="padding:4px 0">${reference}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280">URL</td><td style="padding:4px 0"><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Organisatie</td><td style="padding:4px 0">${org ? `${escapeHtml(org.name)} (${escapeHtml(org.slug)})` : "niet herkend"}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Melder</td><td style="padding:4px 0">${
          reporterEmail
            ? `${escapeHtml(reporterName || "—")} &lt;${escapeHtml(reporterEmail)}&gt;`
            : "anoniem"
        }</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Te goeder trouw</td><td style="padding:4px 0">bevestigd</td></tr>
      </table>
      <div style="margin:16px 0;padding:16px;background:#f5f3ee;border-radius:8px;font-size:14px;white-space:pre-wrap">${escapeHtml(description)}</div>
      ${org ? `<p style="margin:24px 0">${btn(`${env.APP_URL}/admin/organizations/${org.id}`, "Open organisatie in admin")}</p>` : ""}
      <p style="font-size:12px;color:#6b7280">
        Beoordeel zonder onnodige vertraging, informeer de klant vóór of direct na ingrijpen en de melder over de uitkomst (voorwaarden art. 7).
      </p>
    `),
    text: `Melding ${reference}\nURL: ${url}\nOrganisatie: ${org ? `${org.name} (${org.slug})` : "niet herkend"}\nMelder: ${
      reporterEmail ? `${reporterName || "-"} <${reporterEmail}>` : "anoniem"
    }\n\n${description}`,
  });

  // Ontvangstbevestiging aan de melder (DSA art. 16 lid 4).
  if (reporterEmail) {
    await sendEmail({
      to: reporterEmail,
      subject: `We hebben je melding ontvangen (${reference})`,
      html: emailLayout(`
        <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600">Bedankt voor je melding</h1>
        <p>Hoi${reporterName ? ` ${escapeHtml(reporterName)}` : ""},</p>
        <p>
          We hebben je melding over <a href="${escapeHtml(url)}">${escapeHtml(url)}</a>
          ontvangen onder kenmerk <strong>${reference}</strong>. We beoordelen de
          melding zorgvuldig en zonder onnodige vertraging en laten je weten wat
          we ermee doen. Reageer op deze mail als je iets wilt toevoegen.
        </p>
        <p style="font-size:13px;color:#6b7280">${COMPANY.legalName} — contactpunt: ${COMPANY.email}</p>
      `),
      text: `We hebben je melding over ${url} ontvangen onder kenmerk ${reference}. We beoordelen de melding zonder onnodige vertraging en laten je de uitkomst weten.`,
    });
  }

  return { ok: true };
}
