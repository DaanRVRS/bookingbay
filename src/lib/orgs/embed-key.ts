import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Genereert een Stripe-stijl publieke embed-key (`pk_<32-hex>`). Veilig om
 * naar externe sites te exposen — geeft alleen toegang tot het lookup-
 * endpoint dat de slug terugvertaalt.
 */
export function generatePublicEmbedKey(): string {
  return "pk_" + randomBytes(16).toString("hex");
}

/**
 * Zorgt dat de org een publicEmbedKey heeft. Idempotent: als 'ie al gezet
 * is, retourneert de bestaande waarde. Anders genereert + persisteert.
 *
 * Bij een (uiterst onwaarschijnlijke) race waar twee requests tegelijk
 * willen genereren: de unique constraint vangt het op en we lezen 'm
 * opnieuw uit de DB.
 */
export async function ensurePublicEmbedKey(
  organizationId: string,
): Promise<string> {
  const current = await db.organization.findUnique({
    where: { id: organizationId },
    select: { publicEmbedKey: true },
  });
  if (current?.publicEmbedKey) return current.publicEmbedKey;

  const key = generatePublicEmbedKey();
  try {
    await db.organization.update({
      where: { id: organizationId },
      data: { publicEmbedKey: key },
    });
    return key;
  } catch {
    // Andere request was ons voor — herhaal de read.
    const refreshed = await db.organization.findUnique({
      where: { id: organizationId },
      select: { publicEmbedKey: true },
    });
    if (refreshed?.publicEmbedKey) return refreshed.publicEmbedKey;
    throw new Error("Kon publicEmbedKey niet genereren");
  }
}
