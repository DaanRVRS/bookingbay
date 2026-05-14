import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

/**
 * AES-256-GCM versleuteling voor OAuth-tokens en andere secrets die we
 * in `OrgIntegration.config` opslaan. De sleutel komt uit
 * `INTEGRATION_ENCRYPTION_KEY` (32 bytes, hex-encoded).
 *
 * Output-formaat: `v1:<iv-hex>:<authTag-hex>:<ciphertext-hex>` — versie-prefix
 * zo dat we later sleutel-rotatie kunnen ondersteunen zonder bestaande
 * tokens te breken.
 */

const VERSION = "v1";

function getKey(): Buffer {
  if (!env.INTEGRATION_ENCRYPTION_KEY) {
    throw new Error(
      "INTEGRATION_ENCRYPTION_KEY niet gezet — genereer met 'openssl rand -hex 32'",
    );
  }
  return Buffer.from(env.INTEGRATION_ENCRYPTION_KEY, "hex");
}

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12); // 96-bit nonce voor GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("hex"), tag.toString("hex"), enc.toString("hex")].join(
    ":",
  );
}

export function decryptSecret(encoded: string): string {
  const [version, ivHex, tagHex, dataHex] = encoded.split(":");
  if (version !== VERSION) {
    throw new Error(`Onbekende cipher-versie: ${version}`);
  }
  const key = getKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

/**
 * Versleutelt elk veld waarvan de naam start met `_enc` — handig om tokens
 * onder een vrije JSON-config te bewaren. Niet-`_enc` velden blijven
 * leesbaar (handig voor scopes, account-emails etc. die niet gevoelig zijn).
 */
export function sealConfig(config: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(config)) {
    if (k.startsWith("_enc") && typeof v === "string") {
      out[k] = encryptSecret(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function unsealConfig(
  config: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!config) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(config)) {
    if (k.startsWith("_enc") && typeof v === "string") {
      try {
        out[k] = decryptSecret(v);
      } catch {
        out[k] = null;
      }
    } else {
      out[k] = v;
    }
  }
  return out;
}
