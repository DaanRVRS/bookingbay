import "server-only";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit/log";
import { COMPANY, RETENTION } from "@/lib/company";
import { sendEmail, emailLayout, btn, EMAIL_ACCENT, escapeHtml } from "@/lib/email";
import { deleteOrganizationPermanently } from "@/lib/orgs/delete";
import {
  decideOrgRetention,
  orgDeletionSchedule,
  plannedDeletionDate,
  type OrgDeletionSchedule,
} from "./org-lifecycle";

/**
 * Cron-stap (onderdeel van runRetention): gestopte organisaties
 * RETENTION.orgDeleteMonths na de stopdatum verwijderen, met één
 * waarschuwingsmail RETENTION.orgDeleteWarnDays vooraf aan alle eigenaren.
 * De beslissing per organisatie zit in org-lifecycle.ts (puur, getest);
 * hier alleen database, mail en de daadwerkelijke verwijdering.
 *
 * Verwijderen gaat per run in een beperkt aantal, zodat een eerste run na
 * de deploy (of na een lange storing) niet in één keer alles wegwerkt.
 */

const MAX_DELETIONS_PER_RUN = 25;

export interface OrgDeletionSummary {
  /** Waarschuwingsmails verstuurd (één per organisatie). */
  orgDeletionWarned: number;
  /** Organisaties definitief verwijderd. */
  orgsDeleted: number;
  /** Waarschuwingen ingetrokken omdat de organisatie weer actief is. */
  orgDeletionWarningsCleared: number;
}

interface CandidateOrg {
  id: string;
  name: string;
  subscriptionStatus: string | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  paidUntil: Date | null;
  suspendedAt: Date | null;
  deletionWarnedAt: Date | null;
}

export async function runOrgDeletionStep(now: Date): Promise<OrgDeletionSummary> {
  const summary: OrgDeletionSummary = {
    orgDeletionWarned: 0,
    orgsDeleted: 0,
    orgDeletionWarningsCleared: 0,
  };

  // Ruime voorselectie in de database; de echte beslissing neemt
  // decideOrgRetention op basis van alle velden. Demo-organisaties doen
  // niet mee (fictieve gegevens, eigen levenscyclus).
  const candidates: CandidateOrg[] = await db.organization.findMany({
    where: {
      isDemo: false,
      OR: [
        { suspendedAt: { not: null } },
        { deletionWarnedAt: { not: null } },
        { trialEndsAt: { lt: now } },
        { paidUntil: { lt: now } },
        { currentPeriodEnd: { lt: now } },
      ],
    },
    select: {
      id: true,
      name: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
      paidUntil: true,
      suspendedAt: true,
      deletionWarnedAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  for (const org of candidates) {
    const schedule = orgDeletionSchedule(org, now);
    const decision = decideOrgRetention(org, now);

    if (decision === "clear-warning" || !schedule) {
      if (org.deletionWarnedAt) {
        await db.organization.update({
          where: { id: org.id },
          data: { deletionWarnedAt: null },
        });
        summary.orgDeletionWarningsCleared++;
      }
      continue;
    }

    if (decision === "warn") {
      await warnOwners(org, schedule, now);
      summary.orgDeletionWarned++;
      continue;
    }

    if (decision === "delete") {
      if (summary.orgsDeleted >= MAX_DELETIONS_PER_RUN) continue;
      await deleteOrganizationPermanently({
        organizationId: org.id,
        reason: "retention",
        metadata: {
          stoppedAt: schedule.stoppedAt.toISOString(),
          warnedAt: org.deletionWarnedAt?.toISOString() ?? null,
          deleteMonths: RETENTION.orgDeleteMonths,
        },
      });
      console.log(
        `[retention] organisatie ${org.id} verwijderd (${RETENTION.orgDeleteMonths} maanden na einde abonnement/proef)`,
      );
      summary.orgsDeleted++;
    }
  }

  return summary;
}

/* -------------------- Waarschuwingsmail -------------------- */

async function warnOwners(
  org: CandidateOrg,
  schedule: OrgDeletionSchedule,
  now: Date,
): Promise<void> {
  const deleteAt = plannedDeletionDate(schedule, now);
  const recipients = await ownerRecipients(org.id);

  const dateLong = format(deleteAt, "EEEE d MMMM yyyy", { locale: nl });
  const dateShort = format(deleteAt, "d MMMM yyyy", { locale: nl });
  const stoppedLabel = format(schedule.stoppedAt, "d MMMM yyyy", { locale: nl });

  const subject = `Je ${COMPANY.brand}-organisatie wordt op ${dateShort} verwijderd`;
  const html = renderDeletionWarningEmail({
    orgName: org.name,
    stoppedLabel,
    dateLong,
    dateShort,
  });

  await Promise.all([
    ...recipients.map((u) => sendEmail({ to: u.email, subject, html })),
    recipients.length > 0
      ? db.notification.createMany({
          data: recipients.map((u) => ({
            userId: u.id,
            organizationId: org.id,
            type: "billing",
            title: `Organisatie wordt verwijderd op ${dateShort}`,
            body: `Je abonnement of proefperiode is gestopt. Hervat je abonnement vóór ${dateShort}, anders verwijderen we de organisatie automatisch. Facturen blijven bewaard.`,
            ctaUrl: "/dashboard/settings/billing",
            ctaLabel: "Abonnement hervatten",
          })),
        })
      : Promise.resolve(),
  ]);

  await db.organization.update({
    where: { id: org.id },
    data: { deletionWarnedAt: now },
  });
  await audit({
    organizationId: org.id,
    action: "org.deletion.warned",
    resource: "organization",
    resourceId: org.id,
    metadata: {
      stoppedAt: schedule.stoppedAt.toISOString(),
      deleteAt: deleteAt.toISOString(),
      recipients: recipients.length,
    },
  });
}

/** Eigenaren met e-mailadres; zijn die er niet, dan de beheerders. */
async function ownerRecipients(organizationId: string): Promise<{ id: string; email: string }[]> {
  const pick = async (role: "OWNER" | "ADMIN") => {
    const rows = await db.membership.findMany({
      where: { organizationId, role },
      select: { user: { select: { id: true, email: true } } },
      take: 10,
    });
    return rows
      .map((m) => m.user)
      .filter((u): u is { id: string; email: string } => Boolean(u?.email));
  };
  const owners = await pick("OWNER");
  return owners.length > 0 ? owners : pick("ADMIN");
}

function renderDeletionWarningEmail(args: {
  orgName: string;
  stoppedLabel: string;
  dateLong: string;
  dateShort: string;
}): string {
  const name = escapeHtml(args.orgName);
  const billingUrl = `${env.APP_URL}/dashboard/settings/billing`;
  return emailLayout(`
    <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600">Je organisatie wordt op ${args.dateShort} verwijderd</h1>
    <p>Hoi,</p>
    <p>
      Het abonnement of de proefperiode van <strong>${name}</strong> is op
      ${args.stoppedLabel} gestopt. Gestopte organisaties bewaren we
      ${RETENTION.orgDeleteMonths} maanden; daarna verwijderen we ze
      automatisch. Voor ${name} gebeurt dat op
      <strong>${args.dateLong}</strong>.
    </p>
    <p>
      <strong>Wat er dan verdwijnt:</strong> de organisatie zelf, met alle
      items, klanten, boekingen, leads, reviews, pagina&rsquo;s en klantsite,
      koppelingen, teamleden en ge&uuml;ploade afbeeldingen. Je persoonlijke
      account blijft bestaan.
    </p>
    <p>
      <strong>Wat blijft:</strong> je facturen bewaren we
      ${RETENTION.financeYears} jaar (wettelijke bewaarplicht). Download ze
      v&oacute;&oacute;r ${args.dateShort} via Instellingen &rarr; Plan &amp;
      facturatie; daarna kun je ze bij ons opvragen.
    </p>
    <p>
      <strong>Wil je dit niet?</strong> Log in en hervat je abonnement
      v&oacute;&oacute;r ${args.dateShort} (Instellingen &rarr; Plan &amp;
      facturatie); dan blijft alles staan. Wil je eerst je gegevens
      meenemen, exporteer dan boekingen en klanten als CSV in het dashboard.
      Wil je de organisatie liever nu al verwijderen, dan kan dat zelf via
      Instellingen &rarr; Organisatie.
    </p>
    <div style="margin:28px 0">
      ${btn(billingUrl, "Inloggen en hervatten")}
    </div>
    <p style="font-size:13px;color:#6b7280;margin-top:24px">
      Vragen?
      <a href="mailto:${COMPANY.email}" style="color:${EMAIL_ACCENT}">Stuur ons een mail</a>
      &mdash; dan denken we mee.
    </p>
  `);
}
