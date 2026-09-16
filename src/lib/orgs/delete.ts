import "server-only";
import { rm } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit/log";

/** Wie of wat de verwijdering in gang zette (komt in de audit-regel). */
export type OrgDeleteReason = "owner" | "admin" | "retention";

/**
 * Verwijdert een organisatie definitief. Eén plek voor de eigenaar
 * (deleteOrgAction), de beheerder (adminDeleteOrgAction) en de retentie-cron,
 * zodat ze precies hetzelfde doen:
 *
 *  1. De database-rij wissen. onDelete: Cascade ruimt leden, uitnodigingen,
 *     items, klanten, boekingen, leads, reviews, pagina's, koppelingen,
 *     notificaties en de audit-log van de organisatie op. Facturen blijven
 *     bestaan (Invoice.organizationId → null) voor de fiscale bewaarplicht.
 *  2. De geüploade afbeeldingen (public/uploads/<orgId>) van de schijf halen.
 *  3. Een audit-regel zónder organizationId — anders zou die met de
 *     organisatie mee worden gewist.
 */
export async function deleteOrganizationPermanently(args: {
  organizationId: string;
  reason: OrgDeleteReason;
  actorUserId?: string | null;
  /** Extra context voor de audit-regel. Geen persoonsgegevens meegeven. */
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.organization.delete({ where: { id: args.organizationId } });
  await removeOrgUploads(args.organizationId);
  await audit({
    actorUserId: args.actorUserId ?? null,
    action: "org.delete",
    resource: "organization",
    resourceId: args.organizationId,
    metadata: { reason: args.reason, ...args.metadata },
  });
}

/** Wist public/uploads/<orgId>; ontbrekende map = niets te doen. */
async function removeOrgUploads(organizationId: string): Promise<void> {
  // Alleen een cuid-achtige id toestaan zodat we nooit buiten de map werken.
  if (!/^[a-z0-9]+$/i.test(organizationId)) return;
  const dir = path.join(process.cwd(), "public", "uploads", organizationId);
  try {
    await rm(dir, { recursive: true, force: true });
  } catch (err) {
    console.error("[orgs] uploads verwijderen mislukt:", err);
  }
}
