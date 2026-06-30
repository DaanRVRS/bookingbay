import { format } from "date-fns";
import { nl } from "date-fns/locale";

export function fmtDateLong(iso: string): string {
  return format(new Date(iso), "EEEE d MMMM yyyy", { locale: nl });
}

export function fmtDate(iso: string): string {
  return format(new Date(iso), "d MMM yyyy", { locale: nl });
}

export function fmtTime(iso: string): string {
  return format(new Date(iso), "HH:mm");
}

export function fmtDateTimeShort(iso: string): string {
  return format(new Date(iso), "d-MM-yyyy HH:mm", { locale: nl });
}

export function eur(n: number): string {
  return `€ ${n.toFixed(2).replace(".", ",")}`;
}

/** Korte, leesbare boekingsreferentie uit de cuid. */
export function shortRef(id: string): string {
  return id.slice(-8).toUpperCase();
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "In afwachting",
  CONFIRMED: "Bevestigd",
  IN_PROGRESS: "Bezig",
  COMPLETED: "Voltooid",
  CANCELED: "Geannuleerd",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

const PAYMENT_LABELS: Record<string, string> = {
  PAID: "Betaald",
  UNPAID: "Niet betaald",
  EXPIRED: "Verlopen",
  REFUNDED: "Terugbetaald",
};

export function paymentLabel(status: string | null): string | null {
  if (!status) return null;
  return PAYMENT_LABELS[status] ?? status;
}
