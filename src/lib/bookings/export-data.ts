import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  flatFeeLines,
  sumAddons,
  rentalUnitCount,
  unitLabel,
  type BookingAddonLine,
  type FeeSnapshot,
  type FlatFeeLine,
} from "./price";

/**
 * Gedeelde datalaag voor de boekingen-exports (PDF-printpagina + XML-download).
 * Eén plek die een boeking verrijkt met de volledige prijsopbouw, zodat PDF en
 * XML gegarandeerd dezelfde bedragen tonen als het dashboard/de bevestigingsmail.
 */

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface BookingBreakdown {
  /** Eenheidslabel van het item (uur/dag/…). */
  unit: string;
  /** Aantal verhuur-eenheden (ceil duur / interval). */
  units: number;
  /** Zuivere huurprijs = totaal − fees − extra's. */
  subtotal: number;
  /** Fee-regels (schoonmaak vast; kapitein/brandstof × eenheden). */
  feeLines: FlatFeeLine[];
  feesTotal: number;
  /** Gekozen extra's (snapshot op de boeking). */
  addonList: BookingAddonLine[];
  addonsTotal: number;
  /** Eindtotaal (= booking.totalPrice). */
  total: number;
}

interface BreakdownItem {
  bookingIntervalMinutes: number;
  cleaningFee: unknown;
  captainFee: unknown;
  fuelFee: unknown;
}

/**
 * Splitst booking.totalPrice in subtotaal + fees + extra's. Dezelfde logica als
 * de portal-pagina en de bevestigingsmail (subtotaal = totaal − fees − extra's).
 */
export function computeBookingBreakdown(args: {
  startMs: number;
  endMs: number;
  totalPrice: number;
  item: BreakdownItem;
  addons: BookingAddonLine[] | null;
}): BookingBreakdown {
  const units = rentalUnitCount(
    args.startMs,
    args.endMs,
    args.item.bookingIntervalMinutes,
  );
  const feeLines = flatFeeLines(args.item, units);
  const feesTotal = round2(feeLines.reduce((s, l) => s + l.amount, 0));
  const addonList = args.addons ?? [];
  const addonsTotal = sumAddons(addonList);
  const subtotal = Math.max(0, round2(args.totalPrice - feesTotal - addonsTotal));
  return {
    unit: unitLabel(args.item.bookingIntervalMinutes),
    units,
    subtotal,
    feeLines,
    feesTotal,
    addonList,
    addonsTotal,
    total: round2(args.totalPrice),
  };
}

export interface OrgHeader {
  name: string;
  slug: string;
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  primaryColor: string | null;
}

export interface BookingExportRecord {
  id: string;
  status: string;
  createdAt: string;
  startAt: string;
  endAt: string;
  itemName: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  notes: string | null;
  paymentStatus: string | null;
  paymentProvider: string | null;
  breakdown: BookingBreakdown;
}

const bookingExportInclude = {
  item: {
    select: {
      name: true,
      bookingIntervalMinutes: true,
      cleaningFee: true,
      captainFee: true,
      fuelFee: true,
    },
  },
  customer: { select: { name: true, email: true, phone: true } },
} satisfies Prisma.BookingInclude;

type LoadedBooking = Prisma.BookingGetPayload<{
  include: typeof bookingExportInclude;
}>;

function toRecord(b: LoadedBooking): BookingExportRecord {
  const addons = (b.addons as BookingAddonLine[] | null) ?? null;
  // Fee-opbouw uit de SNAPSHOT (bewaard bij boeken) zodat de export toont wat
  // de klant betaalde — óók als de eigenaar de item-fees later wijzigde. Oude
  // boekingen zonder snapshot vallen terug op de live item-fees.
  const snap = (b.feeSnapshot as FeeSnapshot | null) ?? null;
  const breakdown = computeBookingBreakdown({
    startMs: b.startAt.getTime(),
    endMs: b.endAt.getTime(),
    totalPrice: Number(b.totalPrice),
    item: snap ?? b.item,
    addons,
  });
  return {
    id: b.id,
    status: b.status,
    createdAt: b.createdAt.toISOString(),
    startAt: b.startAt.toISOString(),
    endAt: b.endAt.toISOString(),
    itemName: b.item.name,
    customerName: b.customer.name,
    customerEmail: b.customer.email,
    customerPhone: b.customer.phone,
    notes: b.notes,
    paymentStatus: b.paymentStatus,
    paymentProvider: b.paymentProvider,
    breakdown,
  };
}

async function loadOrgHeader(organizationId: string): Promise<OrgHeader | null> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      name: true,
      slug: true,
      logoUrl: true,
      contactEmail: true,
      contactPhone: true,
      primaryColor: true,
    },
  });
  return org;
}

/** Eén boeking voor export (per-boeking PDF/XML). null = niet gevonden. */
export async function loadBookingForExport(
  organizationId: string,
  bookingId: string,
): Promise<{ org: OrgHeader; booking: BookingExportRecord } | null> {
  const [org, booking] = await Promise.all([
    loadOrgHeader(organizationId),
    db.booking.findFirst({
      where: { id: bookingId, organizationId },
      include: bookingExportInclude,
    }),
  ]);
  if (!org || !booking) return null;
  return { org, booking: toRecord(booking) };
}

/** Veiligheidscap: voorkomt dat een mega-export de server (of het PDF) plat legt. */
export const BOOKINGS_EXPORT_LIMIT = 5000;

/** Alle (gefilterde) boekingen voor de lijst-export. */
export async function loadBookingsForExport(
  organizationId: string,
  where: Prisma.BookingWhereInput,
  orderBy: Prisma.BookingOrderByWithRelationInput,
): Promise<{ org: OrgHeader; bookings: BookingExportRecord[]; capped: boolean }> {
  const org = await loadOrgHeader(organizationId);
  if (!org) {
    return { org: { name: "", slug: "", logoUrl: null, contactEmail: null, contactPhone: null, primaryColor: null }, bookings: [], capped: false };
  }
  const rows = await db.booking.findMany({
    where,
    include: bookingExportInclude,
    orderBy,
    take: BOOKINGS_EXPORT_LIMIT + 1,
  });
  const capped = rows.length > BOOKINGS_EXPORT_LIMIT;
  return {
    org,
    bookings: rows.slice(0, BOOKINGS_EXPORT_LIMIT).map(toRecord),
    capped,
  };
}

// ── XML ────────────────────────────────────────────────────────────────────

function xmlEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function money(n: number): string {
  return n.toFixed(2);
}

/** Serialiseert één boeking naar een <booking>…</booking>-element (2-spatie indent). */
function serializeBooking(b: BookingExportRecord, indent = "  "): string {
  const i = indent;
  const i2 = i + "  ";
  const i3 = i2 + "  ";
  const lines: string[] = [];
  lines.push(`${i}<booking id="${xmlEscape(b.id)}" status="${xmlEscape(b.status)}">`);
  lines.push(`${i2}<createdAt>${xmlEscape(b.createdAt)}</createdAt>`);
  lines.push(`${i2}<period>`);
  lines.push(`${i3}<start>${xmlEscape(b.startAt)}</start>`);
  lines.push(`${i3}<end>${xmlEscape(b.endAt)}</end>`);
  lines.push(`${i2}</period>`);
  lines.push(`${i2}<customer>`);
  lines.push(`${i3}<name>${xmlEscape(b.customerName)}</name>`);
  lines.push(`${i3}<email>${xmlEscape(b.customerEmail)}</email>`);
  lines.push(`${i3}<phone>${xmlEscape(b.customerPhone)}</phone>`);
  lines.push(`${i2}</customer>`);
  lines.push(`${i2}<item unit="${xmlEscape(b.breakdown.unit)}">${xmlEscape(b.itemName)}</item>`);
  lines.push(`${i2}<pricing currency="EUR">`);
  lines.push(`${i3}<subtotal>${money(b.breakdown.subtotal)}</subtotal>`);
  if (b.breakdown.feeLines.length > 0) {
    lines.push(`${i3}<fees>`);
    for (const f of b.breakdown.feeLines) {
      lines.push(
        `${i3}  <fee label="${xmlEscape(f.label)}">${money(f.amount)}</fee>`,
      );
    }
    lines.push(`${i3}</fees>`);
  }
  if (b.breakdown.addonList.length > 0) {
    lines.push(`${i3}<addons>`);
    for (const a of b.breakdown.addonList) {
      lines.push(
        `${i3}  <addon name="${xmlEscape(a.name)}" quantity="${xmlEscape(
          a.quantity,
        )}" unitPrice="${money(Number(a.unitPrice) || 0)}">${money(
          (Number(a.unitPrice) || 0) * (Number(a.quantity) || 0),
        )}</addon>`,
      );
    }
    lines.push(`${i3}</addons>`);
  }
  lines.push(`${i3}<total>${money(b.breakdown.total)}</total>`);
  lines.push(`${i2}</pricing>`);
  lines.push(
    `${i2}<payment status="${xmlEscape(b.paymentStatus ?? "")}" provider="${xmlEscape(
      b.paymentProvider ?? "",
    )}" />`,
  );
  if (b.notes) lines.push(`${i2}<notes>${xmlEscape(b.notes)}</notes>`);
  lines.push(`${i}</booking>`);
  return lines.join("\n");
}

/** XML voor één boeking (root = <booking>). */
export function bookingToXml(org: OrgHeader, b: BookingExportRecord): string {
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<booking xmlns="urn:bookingbay:booking" id="${xmlEscape(b.id)}" status="${xmlEscape(
      b.status,
    )}" organization="${xmlEscape(org.name)}">`,
    serializeBookingBody(b, "  "),
    `</booking>`,
    "",
  ].join("\n");
}

// Body zonder de buitenste <booking>-tag (voor de single-root variant).
function serializeBookingBody(b: BookingExportRecord, indent: string): string {
  const full = serializeBooking(b, "");
  // Strip de eerste en laatste regel (<booking …> / </booking>) en herinspring.
  const inner = full.split("\n").slice(1, -1);
  return inner.map((l) => indent + l).join("\n");
}

/** XML voor een lijst boekingen (root = <bookings>). */
export function bookingsToXml(
  org: OrgHeader,
  bookings: BookingExportRecord[],
  generatedAt: string,
): string {
  const head = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<bookings xmlns="urn:bookingbay:booking" organization="${xmlEscape(
      org.name,
    )}" generatedAt="${xmlEscape(generatedAt)}" count="${bookings.length}">`,
  ];
  const body = bookings.map((b) => serializeBooking(b, "  "));
  return [...head, ...body, `</bookings>`, ""].join("\n");
}
