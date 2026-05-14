"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { audit } from "@/lib/audit/log";
import { sendEmail, emailLayout, btn } from "@/lib/email";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/auth/schemas";
import { getIntegration } from "./catalog";
import { syncSubscriptionAmount } from "@/lib/billing/subscription";

const ORG_STATUSES = [
  "INTERESTED",
  "REQUESTED",
  "ACTIVE",
  "PAUSED",
  "FAILED",
] as const;

const setStatusSchema = z.object({
  organizationId: z.string().min(1),
  slug: z.string().min(1),
  status: z.enum(ORG_STATUSES),
  /** Optionele prijs-override — bv. korting geven aan strategische klant. */
  monthlyPriceEuro: z.number().int().min(0).max(9999).optional(),
  /** Admin-notitie ("Token aangeleverd via support op 14 mei"). */
  notes: z.string().max(2000).optional(),
  /** Reden bij FAILED — wordt aan klant getoond. */
  failureReason: z.string().max(500).optional(),
});

/**
 * Admin zet een koppeling op een specifieke status. Wordt aangeroepen vanuit
 * de admin-org-pagina nadat de OAuth/handmatige setup met de klant is afgerond.
 * Bij overgang naar ACTIVE mailt + notificeert de klant zodat ze weten dat 't
 * live staat.
 */
export async function adminSetIntegrationStatusAction(
  input: z.infer<typeof setStatusSchema>,
): Promise<ActionResult> {
  const me = await requireAdmin();
  const parsed = setStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ongeldige invoer" };

  const def = getIntegration(parsed.data.slug);
  if (!def) return { ok: false, error: "Koppeling onbekend" };

  const org = await db.organization.findUnique({
    where: { id: parsed.data.organizationId },
    select: { id: true, name: true, slug: true },
  });
  if (!org) return { ok: false, error: "Organisatie niet gevonden" };

  const existing = await db.orgIntegration.findUnique({
    where: {
      organizationId_integrationKey: {
        organizationId: org.id,
        integrationKey: def.slug,
      },
    },
  });

  const now = new Date();
  const targetPrice =
    parsed.data.monthlyPriceEuro ??
    existing?.monthlyPriceEuro ??
    def.monthlyPriceEuro;

  const data = {
    status: parsed.data.status,
    monthlyPriceEuro: targetPrice,
    notes: parsed.data.notes ?? existing?.notes ?? null,
    failureReason:
      parsed.data.status === "FAILED" ? parsed.data.failureReason ?? null : null,
    activatedAt:
      parsed.data.status === "ACTIVE"
        ? existing?.activatedAt ?? now
        : existing?.activatedAt ?? null,
    pausedAt: parsed.data.status === "PAUSED" ? now : null,
  };

  let row;
  if (existing) {
    row = await db.orgIntegration.update({
      where: { id: existing.id },
      data,
    });
  } else {
    row = await db.orgIntegration.create({
      data: {
        organizationId: org.id,
        integrationKey: def.slug,
        ...data,
      },
    });
  }

  // Status-change → herrekent Mollie sub-bedrag (alleen wanneer dit het
  // ACTIVE-totaal raakt en er een actieve sub is). Best-effort.
  await syncSubscriptionAmount(org.id);

  await audit({
    organizationId: org.id,
    actorUserId: me.id,
    action: `integration.admin.${parsed.data.status.toLowerCase()}`,
    resource: "integration",
    resourceId: def.slug,
    metadata: { name: def.name, monthlyPriceEuro: targetPrice },
  });

  // Notificeer alle org-leden bij overgang naar ACTIVE of FAILED.
  if (
    parsed.data.status === "ACTIVE" &&
    existing?.status !== "ACTIVE"
  ) {
    const owners = await db.membership.findMany({
      where: { organizationId: org.id, role: { in: ["OWNER", "ADMIN"] } },
      select: { userId: true, user: { select: { email: true, name: true } } },
    });
    await Promise.all(
      owners.map((m) =>
        db.notification.create({
          data: {
            userId: m.userId,
            organizationId: org.id,
            type: "integration-activated",
            title: `${def.name} is geactiveerd`,
            body:
              targetPrice === 0
                ? `De koppeling is live en wordt automatisch gesynchroniseerd.`
                : `De koppeling is live (€${targetPrice}/maand op je volgende factuur).`,
            ctaUrl: `/dashboard/integrations/${def.slug}`,
            ctaLabel: "Open koppeling",
            createdById: me.id,
          },
        }),
      ),
    );

    // Bevestigingsmail naar de eigenaar(s).
    for (const m of owners) {
      if (!m.user.email) continue;
      await sendEmail({
        to: m.user.email,
        subject: `${def.name}-koppeling staat live`,
        html: emailLayout(`
          <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600">${escapeHtml(def.name)} is geactiveerd</h1>
          <p>De koppeling tussen BookingBay en ${escapeHtml(def.name)} is live.${
            targetPrice > 0
              ? ` De maandprijs (€${targetPrice}) komt automatisch terug op je volgende factuur.`
              : ""
          }</p>
          <p style="margin:24px 0">${btn(
            `${env.APP_URL}/dashboard/integrations/${def.slug}`,
            "Open koppeling",
          )}</p>
        `),
        text: `${def.name} is geactiveerd. ${
          targetPrice > 0
            ? `De maandprijs (€${targetPrice}) komt op je volgende factuur.`
            : ""
        }`,
      });
    }
  } else if (parsed.data.status === "FAILED") {
    const owners = await db.membership.findMany({
      where: { organizationId: org.id, role: { in: ["OWNER", "ADMIN"] } },
      select: { userId: true },
    });
    await Promise.all(
      owners.map((m) =>
        db.notification.create({
          data: {
            userId: m.userId,
            organizationId: org.id,
            type: "integration-failed",
            title: `${def.name}-koppeling onderbroken`,
            body:
              parsed.data.failureReason ??
              `De verbinding moet opnieuw gemaakt worden. Open de koppeling om verder te gaan.`,
            ctaUrl: `/dashboard/integrations/${def.slug}`,
            ctaLabel: "Herstel verbinding",
            createdById: me.id,
          },
        }),
      ),
    );
  }

  revalidatePath(`/admin/organizations/${org.id}`);
  revalidatePath("/dashboard/integrations");
  revalidatePath(`/dashboard/integrations/${def.slug}`);
  if (row.supportTicketId) {
    revalidatePath(`/admin/support/${row.supportTicketId}`);
  }
  return { ok: true };
}

const removeSchema = z.object({
  organizationId: z.string().min(1),
  slug: z.string().min(1),
});

/** Volledig verwijderen vanuit admin (bv. bij verkeerd aangemaakt verzoek). */
export async function adminRemoveIntegrationAction(
  input: z.infer<typeof removeSchema>,
): Promise<ActionResult> {
  const me = await requireAdmin();
  const parsed = removeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ongeldige invoer" };

  const row = await db.orgIntegration.findUnique({
    where: {
      organizationId_integrationKey: {
        organizationId: parsed.data.organizationId,
        integrationKey: parsed.data.slug,
      },
    },
    select: { id: true, supportTicketId: true },
  });
  if (!row) return { ok: true };

  await db.orgIntegration.delete({ where: { id: row.id } });
  await audit({
    organizationId: parsed.data.organizationId,
    actorUserId: me.id,
    action: "integration.admin.remove",
    resource: "integration",
    resourceId: parsed.data.slug,
  });

  revalidatePath(`/admin/organizations/${parsed.data.organizationId}`);
  revalidatePath("/dashboard/integrations");
  if (row.supportTicketId) {
    revalidatePath(`/admin/support/${row.supportTicketId}`);
  }
  return { ok: true };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c),
  );
}
