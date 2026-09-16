import "server-only";
import { db } from "@/lib/db";
import {
  decryptSecret,
  encryptSecret,
  isEncryptionConfigured,
} from "@/lib/integrations/crypto";

/**
 * Versleutelde opslag van het TOTP-geheim (User.twoFactorSecret) met
 * dezelfde AES-256-GCM-sleutel als API-keys en OAuth-tokens
 * (INTEGRATION_ENCRYPTION_KEY). Opgeslagen formaat: "v1:<iv>:<tag>:<data>".
 *
 * Een base32-geheim bevat nooit een dubbele punt, dus het "v1:"-voorvoegsel
 * onderscheidt versleutelde waarden betrouwbaar van oude plaintext-waarden.
 * Die worden bij het opstarten (instrumentation.ts) en bij eerste gebruik
 * omgezet. Zonder sleutel (lokale dev) blijft plaintext-gedrag bestaan.
 */

const ENC_PREFIX = "v1:";

export function isEncryptedTwoFactorSecret(stored: string): boolean {
  return stored.startsWith(ENC_PREFIX);
}

export function sealTwoFactorSecret(plain: string): string {
  return isEncryptionConfigured() ? encryptSecret(plain) : plain;
}

export function unsealTwoFactorSecret(stored: string): string {
  if (!isEncryptedTwoFactorSecret(stored)) return stored;
  return decryptSecret(stored);
}

/**
 * Eenmalige migratie: versleutel alle nog-plaintext geheimen. Idempotent en
 * veilig om bij elke start te draaien (doet niets als er niets te doen is
 * of als er geen sleutel is geconfigureerd). Retourneert het aantal
 * omgezette gebruikers.
 */
export async function migratePlaintextTwoFactorSecrets(): Promise<number> {
  if (!isEncryptionConfigured()) return 0;
  const users = await db.user.findMany({
    where: { twoFactorSecret: { not: null }, NOT: { twoFactorSecret: { startsWith: ENC_PREFIX } } },
    select: { id: true, twoFactorSecret: true },
    take: 1000,
  });
  let migrated = 0;
  for (const u of users) {
    if (!u.twoFactorSecret) continue;
    await db.user.update({
      where: { id: u.id },
      data: { twoFactorSecret: encryptSecret(u.twoFactorSecret) },
    });
    migrated++;
  }
  return migrated;
}
