import type { Prisma } from "@prisma/client";
import { isDerivedKey } from "@/lib/bookings/status";

/**
 * Gedeelde where/sort-logica voor de boekingenlijst. Hergebruikt door de
 * dashboard-lijstpagina én de exports (PDF/XML), zodat een export gegarandeerd
 * dezelfde rijen bevat als wat er op het scherm gefilterd staat.
 */

/**
 * Vertaalt een afgeleide filter-key (uit de UI) naar een Prisma-where op de
 * DB-status-enum. Onbekende key → geen filter.
 */
export function derivedWhere(
  status: string | undefined,
): Prisma.BookingWhereInput {
  if (!isDerivedKey(status)) return {};
  switch (status) {
    case "CANCELED":
      return { status: "CANCELED" };
    case "COMPLETED":
      return { status: "COMPLETED" };
    case "ACTIVE":
      return { status: "IN_PROGRESS" };
    case "RESERVED":
      return { status: { in: ["PENDING", "CONFIRMED"] } };
    default:
      return {};
  }
}

/** Volledige where voor één organisatie: status-filter + vrije zoekterm. */
export function buildBookingsWhere(
  organizationId: string,
  opts: { status?: string; q?: string },
): Prisma.BookingWhereInput {
  const search = (opts.q ?? "").trim();
  return {
    organizationId,
    ...derivedWhere(opts.status),
    ...(search && {
      OR: [
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { customer: { email: { contains: search, mode: "insensitive" } } },
        { item: { name: { contains: search, mode: "insensitive" } } },
      ],
    }),
  };
}

/**
 * "created" = reserveringsdatum (wanneer geboekt) — standaard. "date" =
 * boekingsdatum (de gereserveerde startdatum). dir = nieuwste/oudste eerst.
 */
export function bookingSortOrder(
  sort: string | undefined,
  dir: "asc" | "desc",
): Prisma.BookingOrderByWithRelationInput {
  return sort === "date" ? { startAt: dir } : { createdAt: dir };
}

export function normalizeSort(sort: string | undefined): "date" | "created" {
  return sort === "date" ? "date" : "created";
}

export function normalizeDir(dir: string | undefined): "asc" | "desc" {
  return dir === "asc" ? "asc" : "desc";
}
