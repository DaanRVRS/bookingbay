/**
 * Gedeelde prijsberekening voor de publieke boek-flow. GEEN "server-only"
 * en GEEN imports — pure functie zodat zowel de server (createPublicBooking)
 * als de client (PublicBookingForm) 'm kunnen importeren en gegarandeerd
 * HETZELFDE bedrag berekenen. Mismatch tussen getoonde en gecharchde prijs
 * is precies wat we hiermee voorkomen.
 *
 * Logica (gelijk aan de dashboard-boekingsvorm):
 *  - ≥ 7 dagen + weektarief → per begonnen week
 *  - ≥ 1 dag + dagtarief    → per begonnen dag
 *  - anders uurtarief       → per begonnen uur
 *  - fallback dagtarief     → per begonnen dag (bv. < 1 dag maar alleen dag-prijs)
 *
 * Retourneert het subtotaal (excl. schoonmaakkosten) of null wanneer het
 * item geen enkel bruikbaar tarief heeft.
 */
/**
 * Eén gekozen add-on op een boeking. Snapshot van naam + stuksprijs op het
 * moment van boeken, zodat de regel klopt ook als het add-on-item later
 * wijzigt of verwijderd wordt. Wordt als JSON-array op Booking.addons bewaard.
 */
export interface BookingAddonLine {
  itemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

/**
 * Geldt een add-on voor een item in deze categorie(ën)? `addonCategoryIds`
 * null/leeg = overal. `itemCategoryIds` = de categorie van het hoofd-item
 * plus eventueel diens parent, zodat "Boten" selecteren ook subcategorie
 * "Motorboten" dekt. Pure functie — gedeeld door widget, dashboard en server.
 */
export function addonAppliesToCategory(
  addonCategoryIds: string[] | null | undefined,
  itemCategoryIds: string[],
): boolean {
  if (!addonCategoryIds || addonCategoryIds.length === 0) return true;
  return itemCategoryIds.some((id) => addonCategoryIds.includes(id));
}

/** Som van alle add-on-regels (stuksprijs × aantal). Altijd op 2 decimalen. */
export function sumAddons(
  addons: BookingAddonLine[] | null | undefined,
): number {
  if (!addons || addons.length === 0) return 0;
  let total = 0;
  for (const a of addons) {
    const q = Number(a.quantity) || 0;
    const p = Number(a.unitPrice) || 0;
    if (q > 0 && p >= 0) total += q * p;
  }
  return Math.round(total * 100) / 100;
}

export function estimateRentalSubtotal(opts: {
  startMs: number;
  endMs: number;
  pricePerHour: number | null;
  pricePerDay: number | null;
  pricePerWeek: number | null;
}): number | null {
  const { startMs, endMs, pricePerHour, pricePerDay, pricePerWeek } = opts;
  const ms = endMs - startMs;
  if (!(ms > 0)) return null;

  const hours = ms / (1000 * 60 * 60);
  const days = ms / (1000 * 60 * 60 * 24);

  const round2 = (n: number) => Math.round(n * 100) / 100;

  if (days >= 7 && pricePerWeek) {
    return round2(Math.ceil(days / 7) * pricePerWeek);
  }
  if (days >= 1 && pricePerDay) {
    return round2(Math.ceil(days) * pricePerDay);
  }
  if (pricePerHour) {
    return round2(Math.ceil(hours) * pricePerHour);
  }
  if (pricePerDay) {
    return round2(Math.ceil(days) * pricePerDay);
  }
  return null;
}
