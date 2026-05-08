import "server-only";
import { db } from "@/lib/db";
import type { ActionResult } from "@/lib/auth/schemas";

const SUSPENDED_ERROR_MESSAGE =
  "Je abonnement is gestopt. Open Instellingen → Plan & facturatie om te hervatten — daarna kun je weer toevoegen.";

/**
 * Returns a "suspended" ActionResult when the org has `suspendedAt` set,
 * or `null` when the org is allowed to write. Use at the top of every
 * mutation that *creates* new resources (bookings, items, customers,
 * categories, pages, reviews, invitations, …).
 *
 * Reads, updates and deletes intentionally stay open so suspended orgs
 * can clean up / export their data.
 */
export async function assertOrgActive(
  organizationId: string,
): Promise<ActionResult | null> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { suspendedAt: true },
  });
  if (org?.suspendedAt) {
    return { ok: false, error: SUSPENDED_ERROR_MESSAGE };
  }
  return null;
}
