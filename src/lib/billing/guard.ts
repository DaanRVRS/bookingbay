import "server-only";
import { db } from "@/lib/db";
import type { ActionResult } from "@/lib/auth/schemas";

const SUSPENDED_ERROR_MESSAGE =
  "Je abonnement is gestopt. Open Instellingen → Plan & facturatie om te hervatten — daarna kun je weer toevoegen.";
const TRIAL_ENDED_MESSAGE =
  "Je trial is afgelopen. Activeer je abonnement (Instellingen → Plan & facturatie) om weer toe te voegen.";

/**
 * Returns a "suspended" ActionResult when the org isn't allowed to write,
 * or `null` when the org may write. Use at the top of every mutation that
 * *creates* new resources (bookings, items, customers, pages, …).
 *
 * Writes blocked when:
 *  - suspendedAt is set (Mollie auto-suspend OR admin), of
 *  - trial is afgelopen en er is nog geen actieve Mollie subscription
 *    (de "trial-expired"-staat in de billing-UI).
 *
 * Reads, updates en deletes blijven open zodat een suspended org alsnog
 * kan exporteren / data ophalen / cancellen.
 */
export async function assertOrgActive(
  organizationId: string,
): Promise<ActionResult | null> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      suspendedAt: true,
      trialEndsAt: true,
      subscriptionStatus: true,
      subscriptionId: true,
      paidUntil: true,
    },
  });
  if (!org) return null;

  if (org.suspendedAt) {
    return { ok: false, error: SUSPENDED_ERROR_MESSAGE };
  }

  // Mollie SaaS-flow: active / past_due / canceled (still in period) =
  // mag schrijven. Geen sub + trial verlopen = niet schrijven.
  if (org.subscriptionId && org.subscriptionStatus) {
    if (
      org.subscriptionStatus === "active" ||
      org.subscriptionStatus === "past_due" ||
      org.subscriptionStatus === "canceled"
    ) {
      return null;
    }
  }

  // Legacy paidUntil flow blijft schrijfbaar zolang paidUntil in de
  // toekomst ligt OF de grace nog niet verstreken is (cron suspendt 'm
  // dan vanzelf).
  if (org.paidUntil && org.paidUntil.getTime() > Date.now()) {
    return null;
  }

  // Trial mag normaal schrijven; pas wanneer 'ie voorbij is en er is
  // niets om op terug te vallen blokken we.
  if (org.trialEndsAt && org.trialEndsAt.getTime() > Date.now()) {
    return null;
  }

  // Geen trial meer, geen Mollie sub, geen geldige paidUntil → block.
  if (org.trialEndsAt && org.trialEndsAt.getTime() <= Date.now() && !org.subscriptionId) {
    return { ok: false, error: TRIAL_ENDED_MESSAGE };
  }

  return null;
}
