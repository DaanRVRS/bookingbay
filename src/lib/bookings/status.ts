import type { BookingStatus } from "@prisma/client";

/**
 * Eén bron van waarheid voor hoe een boeking-status getoond wordt.
 *
 * De DB-enum (PENDING/CONFIRMED/...) blijft bestaan, maar de gebruiker ziet
 * een afgeleide, tijd-gebaseerde status:
 *   - Geannuleerd  → status === CANCELED (handmatig, met bevestiging)
 *   - Voltooid     → eindtijd verstreken
 *   - Bezig        → nu tussen start en eind
 *   - Gereserveerd → in de toekomst
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
  startAt: Date | string,
  endAt: Date | string,
  now: Date = new Date(),
): DerivedStatus {
  if (status === "CANCELED") {
    return {
      key: "CANCELED",
      main: "Geannuleerd",
      cls: "bg-destructive/10 text-destructive",
    };
  }
  const start = typeof startAt === "string" ? new Date(startAt) : startAt;
  const end = typeof endAt === "string" ? new Date(endAt) : endAt;

  if (now.getTime() >= end.getTime()) {
    return {
      key: "COMPLETED",
      main: "Voltooid",
      cls: "bg-muted text-muted-foreground",
    };
  }
  if (now.getTime() >= start.getTime()) {
    return {
      key: "ACTIVE",
      main: "Bezig",
      cls: "bg-[oklch(0.62_0.16_250)]/15 text-[oklch(0.5_0.16_255)]",
    };
  }
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
