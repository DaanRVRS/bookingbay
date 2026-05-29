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
