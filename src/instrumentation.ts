/**
 * Draait één keer bij het starten van de Next.js-server (niet tijdens de
 * build). Gebruikt voor eenmalige data-migraties die geen SQL-migratie
 * kunnen zijn omdat ze een applicatiesleutel nodig hebben.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { migratePlaintextTwoFactorSecrets } = await import("@/lib/twofa/secret");
    const migrated = await migratePlaintextTwoFactorSecrets();
    if (migrated > 0) {
      console.log(`[startup] 2FA-geheimen versleuteld: ${migrated}`);
    }
  } catch (err) {
    // Nooit de server-start blokkeren; de lazy migratie bij eerste gebruik
    // (lib/twofa/actions.ts) vangt het alsnog op.
    console.error("[startup] 2FA-migratie mislukt:", err instanceof Error ? err.message : err);
  }
}
