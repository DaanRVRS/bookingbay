import "server-only";
import { subDays, subMonths, subYears } from "date-fns";
import { db } from "@/lib/db";
import { RETENTION } from "@/lib/company";
import { audit } from "@/lib/audit/log";

/**
 * Dagelijkse opruimtaak (AVG art. 5 lid 1 sub e — opslagbeperking). De
 * termijnen komen uit RETENTION in src/lib/company.ts; de privacyverklaring
 * en de verwerkersovereenkomst lezen dezelfde constanten, zodat tekst en
 * gedrag niet uit elkaar kunnen lopen.
 *
 *  1. AuditLog ouder dan RETENTION.auditLogMonths → wissen.
 *  2. Afgehandelde leads ouder dan RETENTION.handledLeadMonths → wissen.
 *  3. Klanten zonder boeking in de laatste RETENTION.customerYears jaar →
 *     anonimiseren (naam/e-mail/telefoon/notities weg; boekingen blijven als
 *     anonieme omzetregels, zonder notities of portaal-link).
 *  4. Prospects (eigen sales-CRM) zonder klantwording, contact of open
 *     follow-up in RETENTION.prospectMonths → wissen.
 *  5. Techniek: verlopen tokens en oude rate-limit-tellers opruimen.
 *
 * Idempotent en in batches — veilig om vaker te draaien.
 */

const ANONYMIZED_NAME = "Geanonimiseerde klant";
const BATCH = 500;

export interface RetentionSummary {
  auditLogsDeleted: number;
  leadsDeleted: number;
  customersAnonymized: number;
  prospectsDeleted: number;
  throttleRowsDeleted: number;
  passwordResetsDeleted: number;
  verificationTokensDeleted: number;
}

export async function runRetention(now: Date = new Date()): Promise<RetentionSummary> {
  const summary: RetentionSummary = {
    auditLogsDeleted: 0,
    leadsDeleted: 0,
    customersAnonymized: 0,
    prospectsDeleted: 0,
    throttleRowsDeleted: 0,
    passwordResetsDeleted: 0,
    verificationTokensDeleted: 0,
  };

  // 1. Audit-log
  const auditCutoff = subMonths(now, RETENTION.auditLogMonths);
  summary.auditLogsDeleted = (
    await db.auditLog.deleteMany({ where: { createdAt: { lt: auditCutoff } } })
  ).count;

  // 2. Afgehandelde leads
  const leadCutoff = subMonths(now, RETENTION.handledLeadMonths);
  summary.leadsDeleted = (
    await db.lead.deleteMany({
      where: { handledAt: { not: null, lt: leadCutoff } },
    })
  ).count;

  // 3. Klanten anonimiseren
  const customerCutoff = subYears(now, RETENTION.customerYears);
  const stale = await db.customer.findMany({
    where: {
      anonymizedAt: null,
      createdAt: { lt: customerCutoff },
      bookings: { none: { endAt: { gte: customerCutoff } } },
    },
    select: { id: true, organizationId: true },
    take: BATCH,
  });
  for (const c of stale) {
    await db.$transaction([
      db.customer.update({
        where: { id: c.id },
        data: {
          name: ANONYMIZED_NAME,
          email: null,
          phone: null,
          notes: null,
          reviewRequestOptOutAt: null,
          anonymizedAt: now,
        },
      }),
      db.booking.updateMany({
        where: { customerId: c.id },
        data: { notes: null, completionNotes: null, portalToken: null },
      }),
    ]);
    await audit({
      organizationId: c.organizationId,
      action: "customer.anonymized",
      resource: "customer",
      resourceId: c.id,
      metadata: { reason: `retentie ${RETENTION.customerYears} jaar na laatste boeking` },
    });
    summary.customersAnonymized++;
  }

  // 4. Prospects zonder vervolg
  const prospectCutoff = subMonths(now, RETENTION.prospectMonths);
  summary.prospectsDeleted = (
    await db.adminProspect.deleteMany({
      where: {
        convertedOrgId: null,
        createdAt: { lt: prospectCutoff },
        updatedAt: { lt: prospectCutoff },
        interactions: { none: { occurredAt: { gte: prospectCutoff } } },
        reminders: { none: { completedAt: null } },
      },
    })
  ).count;

  // 5. Techniek
  summary.throttleRowsDeleted = (
    await db.loginThrottle.deleteMany({
      where: { updatedAt: { lt: subDays(now, 1) } },
    })
  ).count;
  summary.passwordResetsDeleted = (
    await db.passwordReset.deleteMany({
      where: { expires: { lt: subDays(now, 7) } },
    })
  ).count;
  summary.verificationTokensDeleted = (
    await db.verificationToken.deleteMany({
      where: { expires: { lt: subDays(now, 7) } },
    })
  ).count;

  return summary;
}
