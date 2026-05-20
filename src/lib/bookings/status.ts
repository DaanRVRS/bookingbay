import type { BookingStatus } from "@prisma/client";

/**
 * Eén bron van waarheid voor hoe een boeking-status getoond wordt.
 *
 * Volledig DB-driven (geen tijd-automatisme meer): de eigenaar zet
 * "Op bezig" en "Op voltooid" zelf vanuit het dashboard. Mapping:
 *   - CANCELED                 → Geannuleerd
 *   - COMPLETED                → Voltooid
 *   - IN_PROGRESS              → Bezig
 *   - PENDING / CONFIRMED      → Gereserveerd
 */
export type DerivedKey =
  | "RESERVED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELED";

/**
 * Filter-opties voor de boekingenlijst. Bewust afgeleide statussen i.p.v.
 * de ruwe DB-enum (PENDING/CONFIRMED/IN_PROGRESS bestaan voor de gebruiker
 * niet meer). De server vertaalt deze keys naar een tijd-gebaseerde query.
 */
export const DERIVED_FILTERS: { key: DerivedKey; label: string }[] = [
  { key: "RESERVED", label: "Gereserveerd" },
  { key: "ACTIVE", label: "Bezig" },
  { key: "COMPLETED", label: "Voltooid" },
  { key: "CANCELED", label: "Geannuleerd" },
];

export function isDerivedKey(v: unknown): v is DerivedKey {
  return (
    v === "RESERVED" || v === "ACTIVE" || v === "COMPLETED" || v === "CANCELED"
  );
}

export interface DerivedStatus {
  key: DerivedKey;
  main: string;
  /** Tailwind classes voor de pill. */
  cls: string;
}

export function deriveBookingStatus(
  status: BookingStatus,
  // startAt/endAt blijven in de signature voor backward-compat (callers
  // hoeven niet aangepast), maar worden niet meer gebruikt — de status
  // wordt nu volledig uit de DB-enum afgeleid.
  _startAt?: Date | string,
  _endAt?: Date | string,
  _now?: Date,
): DerivedStatus {
  void _startAt;
  void _endAt;
  void _now;
  if (status === "CANCELED") {
    return {
      key: "CANCELED",
      main: "Geannuleerd",
      cls: "bg-destructive/10 text-destructive",
    };
  }
  if (status === "COMPLETED") {
    return {
      key: "COMPLETED",
      main: "Voltooid",
      cls: "bg-[oklch(0.95_0.015_240)] text-[oklch(0.42_0.03_255)] ring-1 ring-inset ring-[oklch(0.88_0.02_240)]/50",
    };
  }
  if (status === "IN_PROGRESS") {
    return {
      key: "ACTIVE",
      main: "Bezig",
      cls: "bg-[oklch(0.62_0.16_250)]/15 text-[oklch(0.5_0.16_255)]",
    };
  }
  // PENDING / CONFIRMED
  return {
    key: "RESERVED",
    main: "Gereserveerd",
    cls: "bg-[oklch(0.7_0.13_150)]/15 text-[oklch(0.46_0.14_150)]",
  };
}

/** Betaal-sublabel onder de hoofdstatus (alleen relevant als niet geannuleerd). */
export function paymentSublabel(
  paymentProvider: string | null,
  paymentStatus: string | null,
): string | null {
  if (paymentProvider && paymentStatus === "PAID") return "Online betaald";
  if (paymentProvider) return "Online — nog niet voldaan";
  return "Betalen op locatie";
}
