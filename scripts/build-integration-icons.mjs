/**
 * Bundelt de merklogo's uit de koppelingen-catalogus lokaal, zodat de
 * browser van een bezoeker nooit een verzoek naar api.iconify.design (of
 * een andere Iconify-host) hoeft te doen — geen IP-adres naar een derde.
 *
 * Leest de icon-sets uit de @iconify-json/* devDependencies en schrijft
 * alleen de gebruikte iconen naar src/lib/integrations/icon-data.json.
 *
 * Draaien na een wijziging in src/lib/integrations/catalog.ts (nieuw
 * iconifyId) of in de icon-lijst hieronder:
 *
 *   node scripts/build-integration-icons.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getIconData } from "@iconify/utils";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Iconen die buiten de catalogus om in de UI staan (bv. betaalinstellingen).
const EXTRA_ICONS = ["logos:stripe"];

// Alle iconifyId's uit de catalogus ophalen zonder TypeScript te hoeven
// compileren: de ids staan als string-literals in het bestand.
const catalogSource = readFileSync(
  path.join(root, "src/lib/integrations/catalog.ts"),
  "utf8",
);
const ids = new Set(EXTRA_ICONS);
for (const m of catalogSource.matchAll(/iconifyId:\s*"([a-z0-9-]+:[a-z0-9-]+)"/g)) {
  ids.add(m[1]);
}

const setCache = new Map();
function loadSet(prefix) {
  if (!setCache.has(prefix)) {
    const file = require.resolve(`@iconify-json/${prefix}/icons.json`);
    setCache.set(prefix, JSON.parse(readFileSync(file, "utf8")));
  }
  return setCache.get(prefix);
}

const out = {};
const missing = [];
for (const id of [...ids].sort()) {
  const [prefix, name] = id.split(":");
  const set = loadSet(prefix);
  const data = getIconData(set, name);
  if (!data) {
    missing.push(id);
    continue;
  }
  // Alleen wat de renderer nodig heeft; geen aliases/parents.
  out[id] = {
    body: data.body,
    width: data.width ?? set.width ?? 16,
    height: data.height ?? set.height ?? 16,
    ...(data.left ? { left: data.left } : {}),
    ...(data.top ? { top: data.top } : {}),
  };
}

const target = path.join(root, "src/lib/integrations/icon-data.json");
writeFileSync(target, JSON.stringify(out, null, 2) + "\n");
console.log(`Geschreven: ${Object.keys(out).length} iconen → ${path.relative(root, target)}`);
if (missing.length > 0) {
  console.warn(`Niet gevonden in de icon-sets (fallback-tegel wordt getoond): ${missing.join(", ")}`);
}
