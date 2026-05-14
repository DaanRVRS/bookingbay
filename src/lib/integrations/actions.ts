"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth/session";
import { audit } from "@/lib/audit/log";
import { sendEmail, emailLayout, btn } from "@/lib/email";
import { env } from "@/lib/env";
import { notifyNewSupportTicket } from "@/lib/discord/notifications";
import type { ActionResult } from "@/lib/auth/schemas";
import { getIntegration } from "./catalog";
import { isGoogleConfigured, revokeToken } from "./google-calendar";
import { unsealConfig } from "./crypto";
import { syncSubscriptionAmount } from "@/lib/billing/subscription";

/**
 * Per-koppeling slug → wat doet 'Activeer' op de detail-pagina?
 *
 *   "oauth-redirect" → de actie returnt een URL waar de client naartoe moet
 *      navigeren (echte OAuth-flow, geen ticket).
 *   default         → activeren = ticket aanmaken; admin activeert handmatig.
 */
function activationKind(slug: string): "oauth-redirect" | "ticket" {
  if (slug === "google-calendar" && isGoogleConfigured()) return "oauth-redirect";
  return "ticket";
}

const SUPPORT_NOTIFY_EMAIL = "hallo@bookingbay.nl";

const slugSchema = z.object({
  slug: z.string().min(1).max(120),
  /** Optionele toelichting van de klant ("Sync alleen werkdagen graag"). */
  note: z.string().max(2000).optional(),
});

/**
 * Klant klikt op "Interesse" bij een 'binnenkort'-koppeling. Maakt een
 * SupportTicket aan zodat we (a) weten dat er vraag is en (b) terug
 * kunnen mailen zodra de koppeling live is. Status = INTERESTED, geen
 * billing-impact.
 *
 * Idempotent: bij een tweede klik updaten we de bestaande row's notitie
 * ipv een tweede ticket te maken.
 */
export async function registerInterestAction(
  input: z.infer<typeof slugSchema>,
): Promise<ActionResult<{ status: "INTERESTED" }>> {
  const ctx = await requireOrg();
  const parsed = slugSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer" };
  }
  const def = getIntegration(parsed.data.slug);
  if (!def) return { ok: false, error: "Koppeling onbekend" };
  if (def.status === "available") {
    return {
      ok: false,
      error: "Deze koppeling kun je direct activeren — geen interesse-formulier nodig.",
    };
  }

  const existing = await db.orgIntegration.findUnique({
    where: {
      organizationId_integrationKey: {
        organizationId: ctx.organization.id,
        integrationKey: def.slug,
      },
    },
    select: { id: true, supportTicketId: true, status: true },
  });

  if (existing && existing.status === "ACTIVE") {
    return { ok: false, error: "Deze koppeling is al actief." };
  }

  // Maak (of update) de OrgIntegration + bijbehorend ticket atomisch.
  const result = await db.$transaction(async (tx) => {
    let ticketId = existing?.supportTicketId ?? null;
    if (!ticketId) {
      const ticket = await tx.supportTicket.create({
        data: {
          organizationId: ctx.organization.id,
          createdById: ctx.user.id,
          subject: `Interesse in koppeling: ${def.name}`,
          category: "feature",
          priority: "LOW",
          status: "AWAITING_SUPPORT",
          lastUserReplyAt: new Date(),
        },
        select: { id: true },
      });
      await tx.supportTicketMessage.create({
        data: {
          ticketId: ticket.id,
          authorUserId: ctx.user.id,
          isStaff: false,
          body: [
            `Interesse in '${def.name}' (catalogus-status: ${def.status}).`,
            parsed.data.note ? `\nToelichting van de klant:\n${parsed.data.note}` : "",
          ].join(""),
        },
      });
      ticketId = ticket.id;
    } else if (parsed.data.note) {
      // Tweede klik met extra context → reply in de bestaande thread.
      await tx.supportTicketMessage.create({
        data: {
          ticketId,
          authorUserId: ctx.user.id,
          isStaff: false,
          body: `Extra toelichting bij interesse in ${def.name}:\n${parsed.data.note}`,
        },
      });
      await tx.supportTicket.update({
        where: { id: ticketId },
        data: { lastMessageAt: new Date(), lastUserReplyAt: new Date() },
      });
    }

    if (existing) {
      await tx.orgIntegration.update({
        where: { id: existing.id },
        data: {
          status: "INTERESTED",
          notes: parsed.data.note ?? null,
        },
      });
    } else {
      await tx.orgIntegration.create({
        data: {
          organizationId: ctx.organization.id,
          integrationKey: def.slug,
          status: "INTERESTED",
          monthlyPriceEuro: def.monthlyPriceEuro,
          notes: parsed.data.note ?? null,
          supportTicketId: ticketId,
        },
      });
    }

    return { ticketId };
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "integration.interest",
    resource: "integration",
    resourceId: def.slug,
    metadata: { name: def.name, ticketId: result.ticketId },
  });

  await notifyNewSupportTicket({
    ticketId: result.ticketId,
    subject: `Interesse in koppeling: ${def.name}`,
    body: parsed.data.note ?? `(Geen extra toelichting — interesse in ${def.name}.)`,
    category: "feature",
    priority: "LOW",
    orgName: ctx.organization.name,
    authorName: ctx.user.name,
    authorEmail: ctx.user.email,
  });

  await sendEmail({
    to: SUPPORT_NOTIFY_EMAIL,
    subject: `[Koppeling] Interesse in ${def.name} — ${ctx.organization.name}`,
    html: emailLayout(`
      <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600">Interesse in een koppeling</h1>
      <p style="margin:0 0 8px 0">
        <strong>${escapeHtml(ctx.organization.name)}</strong> · ${escapeHtml(ctx.user.email)}
      </p>
      <p style="margin:0 0 12px 0">
        Wil <strong>${escapeHtml(def.name)}</strong> kunnen koppelen
        (huidige catalogus-status: ${def.status}).
      </p>
      ${
        parsed.data.note
          ? `<div style="background:#f5f3ee;border-radius:8px;padding:14px 16px;margin:16px 0;white-space:pre-wrap">${escapeHtml(parsed.data.note)}</div>`
          : ""
      }
      <p style="margin:24px 0">${btn(
        `${env.APP_URL}/admin/support/${result.ticketId}`,
        "Bekijk ticket",
      )}</p>
    `),
    text: `Interesse in ${def.name} van ${ctx.organization.name} (${ctx.user.email})${
      parsed.data.note ? `\n\n${parsed.data.note}` : ""
    }`,
  });

  revalidatePath("/dashboard/integrations");
  revalidatePath(`/dashboard/integrations/${def.slug}`);
  return { ok: true, data: { status: "INTERESTED" } };
}

/**
 * Klant klikt 'Activeer' op een available-koppeling. In v1 zetten we 'm
 * op REQUESTED + maken een ticket aan zodat wij handmatig de OAuth-flow
 * kunnen aftrappen. Zodra de daadwerkelijke per-koppeling OAuth gebouwd
 * is, vervangt die deze actie voor die specifieke slug.
 */
export async function requestActivationAction(
  input: z.infer<typeof slugSchema>,
): Promise<ActionResult<{ status: "REQUESTED" } | { redirectTo: string }>> {
  const ctx = await requireOrg();
  const parsed = slugSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer" };
  }
  const def = getIntegration(parsed.data.slug);
  if (!def) return { ok: false, error: "Koppeling onbekend" };
  if (def.status === "coming-soon") {
    return {
      ok: false,
      error: "Deze koppeling is nog niet beschikbaar — gebruik 'Interesse tonen'.",
    };
  }

  const existing = await db.orgIntegration.findUnique({
    where: {
      organizationId_integrationKey: {
        organizationId: ctx.organization.id,
        integrationKey: def.slug,
      },
    },
    select: { id: true, status: true, supportTicketId: true },
  });

  if (existing?.status === "ACTIVE") {
    return { ok: false, error: "Deze koppeling is al actief." };
  }

  // OAuth-koppelingen: skip support-ticket en stuur de client direct naar
  // de OAuth-start endpoint. Daar wordt state-cookie gezet en geredirect
  // naar de provider.
  if (activationKind(def.slug) === "oauth-redirect") {
    return {
      ok: true,
      data: { redirectTo: `/api/integrations/${def.slug}/start` },
    };
  }

  const result = await db.$transaction(async (tx) => {
    let ticketId = existing?.supportTicketId ?? null;
    if (!ticketId) {
      const ticket = await tx.supportTicket.create({
        data: {
          organizationId: ctx.organization.id,
          createdById: ctx.user.id,
          subject: `Activatie-verzoek: ${def.name}`,
          category: "general",
          priority: "NORMAL",
          status: "AWAITING_SUPPORT",
          lastUserReplyAt: new Date(),
        },
        select: { id: true },
      });
      await tx.supportTicketMessage.create({
        data: {
          ticketId: ticket.id,
          authorUserId: ctx.user.id,
          isStaff: false,
          body: [
            `Wil ${def.name} activeren (€${def.monthlyPriceEuro}/maand bovenop het abonnement).`,
            parsed.data.note ? `\nToelichting:\n${parsed.data.note}` : "",
          ].join(""),
        },
      });
      ticketId = ticket.id;
    }

    if (existing) {
      await tx.orgIntegration.update({
        where: { id: existing.id },
        data: {
          status: "REQUESTED",
          monthlyPriceEuro: def.monthlyPriceEuro,
          notes: parsed.data.note ?? null,
        },
      });
    } else {
      await tx.orgIntegration.create({
        data: {
          organizationId: ctx.organization.id,
          integrationKey: def.slug,
          status: "REQUESTED",
          monthlyPriceEuro: def.monthlyPriceEuro,
          notes: parsed.data.note ?? null,
          supportTicketId: ticketId,
        },
      });
    }

    return { ticketId };
  });

  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "integration.request",
    resource: "integration",
    resourceId: def.slug,
    metadata: {
      name: def.name,
      monthlyPriceEuro: def.monthlyPriceEuro,
      ticketId: result.ticketId,
    },
  });

  await notifyNewSupportTicket({
    ticketId: result.ticketId,
    subject: `Activatie-verzoek: ${def.name}`,
    body: parsed.data.note ?? `Klant wil ${def.name} activeren.`,
    category: "general",
    priority: "NORMAL",
    orgName: ctx.organization.name,
    authorName: ctx.user.name,
    authorEmail: ctx.user.email,
  });

  await sendEmail({
    to: SUPPORT_NOTIFY_EMAIL,
    subject: `[Koppeling] Activatie ${def.name} — ${ctx.organization.name}`,
    html: emailLayout(`
      <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600">Nieuw activatie-verzoek</h1>
      <p style="margin:0 0 8px 0">
        <strong>${escapeHtml(ctx.organization.name)}</strong> · ${escapeHtml(ctx.user.email)}
      </p>
      <p style="margin:0 0 12px 0">
        Wil <strong>${escapeHtml(def.name)}</strong> activeren
        (€${def.monthlyPriceEuro}/maand bovenop het abonnement).
      </p>
      ${
        parsed.data.note
          ? `<div style="background:#f5f3ee;border-radius:8px;padding:14px 16px;margin:16px 0;white-space:pre-wrap">${escapeHtml(parsed.data.note)}</div>`
          : ""
      }
      <p style="margin:24px 0">${btn(
        `${env.APP_URL}/admin/support/${result.ticketId}`,
        "Bekijk ticket",
      )}</p>
    `),
    text: `Activatie-verzoek voor ${def.name} van ${ctx.organization.name} (${ctx.user.email})${
      parsed.data.note ? `\n\n${parsed.data.note}` : ""
    }`,
  });

  revalidatePath("/dashboard/integrations");
  revalidatePath(`/dashboard/integrations/${def.slug}`);
  return { ok: true, data: { status: "REQUESTED" } };
}

/** Klant pauzeert een actieve koppeling (sync stopt, billing stopt). */
export async function pauseIntegrationAction(
  input: z.infer<typeof slugSchema>,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  const parsed = slugSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer" };
  }
  const def = getIntegration(parsed.data.slug);
  if (!def) return { ok: false, error: "Koppeling onbekend" };

  const row = await db.orgIntegration.findUnique({
    where: {
      organizationId_integrationKey: {
        organizationId: ctx.organization.id,
        integrationKey: def.slug,
      },
    },
  });
  if (!row || row.status !== "ACTIVE") {
    return { ok: false, error: "Deze koppeling staat niet op actief." };
  }

  // OAuth-koppelingen: revoke het refresh-token bij de provider zodat
  // we 'm later opnieuw met een schone slate kunnen verbinden.
  if (def.slug === "google-calendar") {
    const cfg = unsealConfig(row.config as Record<string, unknown>);
    const refresh = cfg._encRefreshToken;
    if (typeof refresh === "string") {
      await revokeToken(refresh);
    }
  }

  await db.orgIntegration.update({
    where: { id: row.id },
    data: {
      status: "PAUSED",
      pausedAt: new Date(),
      // Bewust de config laten staan — bevat handige diagnostics
      // (account-email, scopes), tokens zijn nu toch revoked.
    },
  });
  // Herrekent Mollie sub-bedrag — eerstvolgende factuur zonder deze koppeling.
  await syncSubscriptionAmount(ctx.organization.id);
  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "integration.pause",
    resource: "integration",
    resourceId: def.slug,
  });

  revalidatePath("/dashboard/integrations");
  revalidatePath(`/dashboard/integrations/${def.slug}`);
  return { ok: true };
}

/** Klant verwijdert/cancelt een verzoek of interesse. */
export async function removeIntegrationAction(
  input: z.infer<typeof slugSchema>,
): Promise<ActionResult> {
  const ctx = await requireOrg();
  const parsed = slugSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer" };
  }
  const def = getIntegration(parsed.data.slug);
  if (!def) return { ok: false, error: "Koppeling onbekend" };

  const row = await db.orgIntegration.findUnique({
    where: {
      organizationId_integrationKey: {
        organizationId: ctx.organization.id,
        integrationKey: def.slug,
      },
    },
  });
  if (!row) return { ok: true };
  if (row.status === "ACTIVE") {
    return {
      ok: false,
      error: "Pauzeer eerst de koppeling — actieve koppelingen verwijderen we niet automatisch om data-loss te voorkomen.",
    };
  }

  // Even bij delete: revoke tokens als ze er nog liggen (bv. bij FAILED).
  if (def.slug === "google-calendar") {
    const cfg = unsealConfig(row.config as Record<string, unknown>);
    const refresh = cfg._encRefreshToken;
    if (typeof refresh === "string") {
      await revokeToken(refresh);
    }
  }

  await db.orgIntegration.delete({ where: { id: row.id } });
  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "integration.remove",
    resource: "integration",
    resourceId: def.slug,
  });

  revalidatePath("/dashboard/integrations");
  revalidatePath(`/dashboard/integrations/${def.slug}`);
  return { ok: true };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c),
  );
}
