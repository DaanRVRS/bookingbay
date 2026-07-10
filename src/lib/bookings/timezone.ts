/**
 * Tenant-tijdzone-helpers. GEEN "server-only" en geen imports — pure functies,
 * deelbaar door server en client.
 *
 * De server draait op Europe/Amsterdam en slaat naïeve wall-clock-strings
 * ("2026-07-15T09:00") op als NL-tijd (`new Date(str)` parseert zonder offset
 * als server-lokaal). De boek-widget bouwt kandidaat-tijden echter met
 * `Date#setHours` in de tijdzone van de BEZOEKER en vergeleek die met
 * boekingen die als absolute NL-epoch-ms uit de availability-API komen. Voor
 * een bezoeker buiten NL schoven de bezet-markeringen daardoor met de
 * tijdzone-offset. Deze helpers rekenen een wall-clock consequent in de
 * tenant-tijdzone naar epoch-ms, ongeacht waar de bezoeker zit.
 */
export const TENANT_TZ = "Europe/Amsterdam";

/**
 * Offset (ms) van de tenant-tijdzone t.o.v. UTC op een gegeven instant:
 * (wall-clock in TZ, geïnterpreteerd als UTC) − het echte UTC-instant.
 */
function tzOffsetMs(instant: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const f: Record<string, number> = {};
  for (const p of dtf.formatToParts(new Date(instant))) {
    if (p.type !== "literal") f[p.type] = Number(p.value);
  }
  // en-US kan 24 teruggeven voor middernacht — normaliseren naar 0.
  const hour = f.hour === 24 ? 0 : f.hour;
  const asUtc = Date.UTC(f.year, f.month - 1, f.day, hour, f.minute, f.second);
  return asUtc - instant;
}

/**
 * Epoch-ms voor een wall-clock (kalenderdatum + HH:MM) geïnterpreteerd in de
 * tenant-tijdzone. Rond DST-overgangen is er een ≤1u-ambiguïteit — ruim
 * voldoende nauwkeurig voor slot-weergave.
 */
export function tenantWallClockToMs(
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute: number,
): number {
  const guess = Date.UTC(year, monthIndex, day, hour, minute);
  return guess - tzOffsetMs(guess, TENANT_TZ);
}

/**
 * Zelfde als {@link tenantWallClockToMs} maar met een Date (waarvan we de
 * kalenderdatum via de lokale componenten nemen — die matchen de dag die de
 * bezoeker in de kalender aanklikte) + een "HH:MM"-tijd.
 */
export function tenantDayTimeToMs(day: Date, hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return tenantWallClockToMs(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    h || 0,
    m || 0,
  );
}
