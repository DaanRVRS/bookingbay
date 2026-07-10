/**
 * Gedeelde prijsberekening voor de publieke boek-flow. GEEN "server-only"
 * en GEEN imports — pure functie zodat zowel de server (createPublicBooking)
 * als de client (PublicBookingForm) 'm kunnen importeren en gegarandeerd
 * HETZELFDE bedrag berekenen. Mismatch tussen getoonde en gecharchde prijs
 * is precies wat we hiermee voorkomen.
 *
 * Logica (gelijk aan de dashboard-boekingsvorm):
 *  - Eén prijs per verhuur-eenheid (pricePerUnit). De eenheid is het
 *    bookingIntervalMinutes (15 min … per dag … per week).
 *  - Subtotaal = ceil(duur in minuten / interval) × pricePerUnit, dus een
 *    interval van 15 min rekent ook écht per 15 min (geen afronding naar uur).
 *
 * Retourneert het subtotaal (excl. schoonmaakkosten) of null wanneer het
 * item geen prijs heeft.
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
  pricePerUnit: number | null;
  bookingIntervalMinutes: number;
}): number | null {
  const { startMs, endMs, pricePerUnit, bookingIntervalMinutes } = opts;
  if (pricePerUnit == null || !(pricePerUnit >= 0)) return null;
  const ms = endMs - startMs;
  if (!(ms > 0)) return null;

  const interval = bookingIntervalMinutes > 0 ? bookingIntervalMinutes : 60;
  const durationMinutes = ms / (1000 * 60);
  const units = Math.ceil(durationMinutes / interval);
  return Math.round(units * pricePerUnit * 100) / 100;
}

// ── Eenheid-labels (gedeeld door dashboard, widget en publieke site) ───────

/**
 * Korte eenheidslabel voor een verhuur-interval, voor prijsweergave.
 * 15→"15 min", 60→"uur", 1440→"dag", 10080→"week".
 */
export function unitLabel(intervalMinutes: number): string {
  switch (intervalMinutes) {
    case 15:
      return "15 min";
    case 30:
      return "30 min";
    case 60:
      return "uur";
    case 90:
      return "1u30";
    case 120:
      return "2 uur";
    case 240:
      return "4 uur";
    case 1440:
      return "dag";
    case 10080:
      return "week";
    default:
      if (intervalMinutes % 1440 === 0) return `${intervalMinutes / 1440} dagen`;
      if (intervalMinutes % 60 === 0) return `${intervalMinutes / 60} uur`;
      return `${intervalMinutes} min`;
  }
}

/** "per uur" / "per dag" / "per week" / "per 15 min". */
export function perUnitLabel(intervalMinutes: number): string {
  return `per ${unitLabel(intervalMinutes)}`;
}

/**
 * Hele-dag-eenheid (per dag of per week): de widget toont dan geen tijdkeuze,
 * de klant kiest alleen datums. Dag = 1440 min, week = 10080 min.
 */
export function isWholeDayUnit(intervalMinutes: number): boolean {
  return intervalMinutes === 1440 || intervalMinutes === 10080;
}

// ── Fees per boeking (schoonmaak / kapitein / brandstof) ───────────────────

/** Item-velden met de fees. Prisma Decimal of number — beide werken
 *  (Number() converteert allebei). Vandaar `unknown`. */
export interface ItemFlatFees {
  cleaningFee?: unknown;
  captainFee?: unknown;
  fuelFee?: unknown;
}

export interface FlatFeeLine {
  label: string;
  amount: number;
}

/**
 * Aantal verhuur-eenheden voor een tijdsduur: ceil(duur / interval), minimaal 1.
 * Gelijk aan de eenheid-telling in estimateRentalSubtotal.
 */
export function rentalUnitCount(
  startMs: number,
  endMs: number,
  bookingIntervalMinutes: number,
): number {
  const ms = endMs - startMs;
  if (!(ms > 0)) return 1;
  const interval = bookingIntervalMinutes > 0 ? bookingIntervalMinutes : 60;
  return Math.max(1, Math.ceil(ms / (1000 * 60) / interval));
}

/**
 * De niet-nul fees van een item als losse regels (voor de prijsopgave).
 * Schoonmaak is een vaste fee per boeking; kapitein en brandstof schalen mee
 * met het aantal verhuur-eenheden (units), net als de huurprijs zelf.
 * Labels zijn Nederlands — net als de bestaande schoonmaak-regel.
 */
export function flatFeeLines(item: ItemFlatFees, units = 1): FlatFeeLine[] {
  const u = units > 0 ? Math.floor(units) : 1;
  const out: FlatFeeLine[] = [];
  const num = (v: unknown) => (v ? Number(v) : 0);
  // Vaste fee (1×): schoonmaak.
  const cleaning = num(item.cleaningFee);
  if (cleaning > 0) out.push({ label: "Schoonmaak", amount: cleaning });
  // Per-eenheid fees (× units): kapitein en brandstof.
  const perUnit = (label: string, v: unknown) => {
    const n = num(v);
    if (n > 0) {
      out.push({
        label: u > 1 ? `${label} (${u}×)` : label,
        amount: Math.round(n * u * 100) / 100,
      });
    }
  };
  perUnit("Kapitein", item.captainFee);
  perUnit("Brandstof", item.fuelFee);
  return out;
}

/** Som van alle fees van een item, op 2 decimalen. */
export function sumFlatFees(item: ItemFlatFees, units = 1): number {
  const total = flatFeeLines(item, units).reduce((s, l) => s + l.amount, 0);
  return Math.round(total * 100) / 100;
}

/**
 * Snapshot van de fee-relevante item-velden op het moment van boeken. Wordt
 * als JSON op Booking.feeSnapshot bewaard zodat de prijsopbouw in exports/
 * facturen klopt, óók als de eigenaar de item-fees later wijzigt.
 */
export interface FeeSnapshot {
  bookingIntervalMinutes: number;
  cleaningFee: number;
  captainFee: number;
  fuelFee: number;
}

export function makeFeeSnapshot(item: {
  bookingIntervalMinutes: number;
  cleaningFee?: unknown;
  captainFee?: unknown;
  fuelFee?: unknown;
}): FeeSnapshot {
  const num = (v: unknown) => (v ? Number(v) : 0);
  return {
    bookingIntervalMinutes: item.bookingIntervalMinutes,
    cleaningFee: num(item.cleaningFee),
    captainFee: num(item.captainFee),
    fuelFee: num(item.fuelFee),
  };
}
