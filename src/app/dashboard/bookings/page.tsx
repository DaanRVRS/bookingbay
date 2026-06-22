import Link from "next/link";
import { CheckCircle2, Plus } from "lucide-react";
import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { isDerivedKey } from "@/lib/bookings/status";
import type { Prisma } from "@prisma/client";
import { BookingList } from "./booking-list";

export const metadata = { title: "Boekingen" };

interface PageProps {
  searchParams: Promise<{
    status?: string;
    sort?: string;
    q?: string;
    dir?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 20;

/**
 * Twee velden × twee richtingen. "created" = reserveringsdatum (wanneer
 * geboekt) — standaard. "date" = boekingsdatum (de gereserveerde startdatum).
 * dir = "desc" (nieuwste eerst) of "asc" (oudste eerst).
 */
function sortOrder(
  sort: string | undefined,
  dir: "asc" | "desc",
): Prisma.BookingOrderByWithRelationInput {
  return sort === "date" ? { startAt: dir } : { createdAt: dir };
}

/**
 * Vertaalt een afgeleide filter-key naar een Prisma-where op de DB-
 * status-enum (de eigenaar zet zelf "Op bezig" / "Op voltooid").
 */
function derivedWhere(status: string | undefined): Prisma.BookingWhereInput {
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
  }
}

export default async function BookingsPage({ searchParams }: PageProps) {
  const ctx = await requireOrg();
  const params = await searchParams;
  const status = params.status;
  const sort = params.sort === "date" ? "date" : "created";
  const dir: "asc" | "desc" = params.dir === "asc" ? "asc" : "desc";
  const search = (params.q ?? "").trim();
  const requestedPage = Math.max(
    1,
    Number.parseInt(params.page ?? "1", 10) || 1,
  );

  const where: Prisma.BookingWhereInput = {
    organizationId: ctx.organization.id,
    ...derivedWhere(status),
    ...(search && {
      OR: [
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { customer: { email: { contains: search, mode: "insensitive" } } },
        { item: { name: { contains: search, mode: "insensitive" } } },
      ],
    }),
  };

  const [filteredCount, totalCount, itemCount] = await Promise.all([
    db.booking.count({ where }),
    db.booking.count({ where: { organizationId: ctx.organization.id } }),
    db.item.count({
      where: { organizationId: ctx.organization.id, isActive: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const bookings = await db.booking.findMany({
    where,
    include: {
      item: { select: { name: true } },
      customer: { select: { name: true } },
    },
    orderBy: sortOrder(sort, dir),
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  // paymentStatus/paymentProvider zitten niet in include maar wel op de row.

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          title="Boekingen"
          description="Alle reserveringen — vandaag, deze week, en alles wat geweest is."
          action={
            itemCount > 0 ? (
              <Link
                href="/dashboard/bookings/new"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                <Plus className="size-4" /> Nieuwe boeking
              </Link>
            ) : undefined
          }
        />

        <div className="mt-6">
          {totalCount === 0 ? (
            itemCount === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Eerst items, dan boekingen"
                description="Je hebt nog geen items in je catalogus. Voeg eerst items toe om reserveringen te kunnen maken."
                action={{ href: "/dashboard/items/new", label: "Eerste item toevoegen" }}
              />
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="Nog geen boekingen"
                description="Maak je eerste boeking aan — kies een item, kies of maak een klant, klaar."
                action={{ href: "/dashboard/bookings/new", label: "Eerste boeking" }}
              />
            )
          ) : (
            <BookingList
              bookings={bookings.map((b) => ({
                id: b.id,
                itemName: b.item.name,
                customerName: b.customer.name,
                startAt: b.startAt.toISOString(),
                endAt: b.endAt.toISOString(),
                createdAt: b.createdAt.toISOString(),
                status: b.status,
                totalPrice: b.totalPrice.toString(),
                paymentStatus: b.paymentStatus,
                paymentProvider: b.paymentProvider,
                completionDamage: b.completionDamage,
              }))}
              currentStatus={status}
              currentSort={sort}
              currentDir={dir}
              currentSearch={search}
              currentPage={page}
              totalPages={totalPages}
              totalResults={filteredCount}
            />
          )}
        </div>
      </div>
    </div>
  );
}
