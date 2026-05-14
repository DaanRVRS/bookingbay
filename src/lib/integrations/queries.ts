import "server-only";
import { db } from "@/lib/db";

/**
 * Per-org state voor alle koppelingen. Geeft een Map<integrationKey, row>
 * terug zodat callers er goedkoop tegen kunnen joinen met de statische
 * catalogus.
 */
export async function listOrgIntegrations(organizationId: string) {
  return db.orgIntegration.findMany({
    where: { organizationId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getOrgIntegrationsMap(
  organizationId: string,
): Promise<
  Map<
    string,
    Awaited<ReturnType<typeof listOrgIntegrations>>[number]
  >
> {
  const rows = await listOrgIntegrations(organizationId);
  return new Map(rows.map((r) => [r.integrationKey, r]));
}

export async function getOrgIntegration(
  organizationId: string,
  integrationKey: string,
) {
  return db.orgIntegration.findUnique({
    where: {
      organizationId_integrationKey: { organizationId, integrationKey },
    },
  });
}

/** Som van maandelijkse upsell-prijzen — voor billing-banner / sidebar. */
export async function sumActiveMonthlyUpsell(
  organizationId: string,
): Promise<number> {
  const rows = await db.orgIntegration.findMany({
    where: { organizationId, status: "ACTIVE" },
    select: { monthlyPriceEuro: true },
  });
  return rows.reduce((sum, r) => sum + r.monthlyPriceEuro, 0);
}
