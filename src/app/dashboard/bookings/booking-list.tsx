"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DERIVED_FILTERS,
  deriveBookingStatus,
  paymentSublabel,
} from "@/lib/bookings/status";
import type { BookingStatus } from "@prisma/client";
import { BookingRowActions } from "./booking-row-actions";

interface Booking {
  id: string;
  itemName: string;
  customerName: string;
  startAt: string;
  endAt: string;
  createdAt: string;
  status: BookingStatus;
  totalPrice: string;
  paymentStatus: string | null;
  paymentProvider: string | null;
  completionDamage: boolean;
}

const SORT_OPTIONS = [
  { value: "created", label: "Op reserveringsdatum" },
  { value: "date", label: "Op boekingsdatum" },
];

const DIR_OPTIONS = [
  { value: "desc", label: "Nieuwste eerst" },
  { value: "asc", label: "Oudste eerst" },
];

/**
 * Zichtbare pagina-knoppen: bij ≤7 alle nummers, anders eerste + laatste +
 * een venster rond de huidige, met "…" voor de gaten.
 */
function pageItems(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  if (current > 3) out.push("…");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) out.push(i);
  if (current < total - 2) out.push("…");
  out.push(total);
  return out;
}

/**
 * Eén bron van waarheid (src/lib/bookings/status.ts): hoofdlabel afgeleid van
 * tijd (Gereserveerd → Bezig → Voltooid) of handmatig Geannuleerd, plus een
 * betaal-sublabel (Online betaald / Betalen op locatie).
 */
function deriveStatus(b: Booking) {
  const d = deriveBookingStatus(b.status, b.startAt, b.endAt);
  return {
    key: d.key,
    main: d.main,
    cls: d.cls,
    sub:
      d.key === "CANCELED"
        ? null
        : paymentSublabel(b.paymentProvider, b.paymentStatus),
  };
}

export function BookingList({
  bookings,
  currentStatus,
  currentSort,
  currentDir,
  currentSearch,
  currentPage = 1,
  totalPages = 1,
  totalResults = 0,
}: {
  bookings: Booking[];
  currentStatus?: string;
  currentSort?: string;
  currentDir?: string;
  currentSearch?: string;
  currentPage?: number;
  totalPages?: number;
  totalResults?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  // Elke filter-/sorteer-/zoek-wijziging stuurt terug naar pagina 1 — anders
  // sta je op een pagina die in de nieuwe selectie niet meer bestaat.
  const navigate = (
    mutate: (sp: URLSearchParams) => void,
    resetPage = true,
  ) => {
    const sp = new URLSearchParams(searchParams.toString());
    mutate(sp);
    if (resetPage) sp.delete("page");
    startTransition(() =>
      router.replace(`/dashboard/bookings?${sp.toString()}`),
    );
  };

  const onStatusChange = (v: string | null) =>
    navigate((sp) => {
      if (!v || v === "__all__") sp.delete("status");
      else sp.set("status", v);
    });

  const onSortChange = (v: string | null) =>
    navigate((sp) => {
      if (!v || v === "created") sp.delete("sort");
      else sp.set("sort", v);
    });

  const onDirChange = (v: string | null) =>
    navigate((sp) => {
      if (!v || v === "desc") sp.delete("dir");
      else sp.set("dir", v);
    });

  const onSearch = (value: string) =>
    navigate((sp) => {
      const v = value.trim();
      if (!v) sp.delete("q");
      else sp.set("q", v);
    });

  const onPage = (p: number) =>
    navigate((sp) => {
      if (p <= 1) sp.delete("page");
      else sp.set("page", String(p));
    }, false);

  return (
    <>
      <div className="relative mb-3 max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Zoek op klant, e-mail of item"
          defaultValue={currentSearch ?? ""}
          onChange={(e) => onSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          items={[
            { value: "__all__", label: "Alle statussen" },
            ...DERIVED_FILTERS.map((s) => ({ value: s.key, label: s.label })),
          ]}
          value={currentStatus ?? "__all__"}
          onValueChange={onStatusChange}
        >
          <SelectTrigger className="sm:w-52">
            <SelectValue placeholder="Alle statussen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Alle statussen</SelectItem>
            {DERIVED_FILTERS.map((s) => (
              <SelectItem key={s.key} value={s.key}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={SORT_OPTIONS}
          value={currentSort ?? "created"}
          onValueChange={onSortChange}
        >
          <SelectTrigger className="sm:w-52">
            <SelectValue placeholder="Sorteren" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={DIR_OPTIONS}
          value={currentDir ?? "desc"}
          onValueChange={onDirChange}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Richting" />
          </SelectTrigger>
          <SelectContent>
            {DIR_OPTIONS.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={`mt-5 overflow-hidden rounded-xl border border-border bg-card ${pending ? "opacity-60" : ""}`}>
        {bookings.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">
            Geen boekingen gevonden met deze filter.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {bookings.map((b) => (
              <li key={b.id}>
                <div className="flex items-center gap-2 px-5 py-4 transition-colors hover:bg-muted/40 sm:gap-4">
                <Link
                  href={`/dashboard/bookings/${b.id}`}
                  className="flex min-w-0 flex-1 items-center gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.itemName}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {b.customerName}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80 tabular-nums">
                      Geboekt op{" "}
                      {new Date(b.createdAt).toLocaleString("nl-NL", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {/* Compact date on mobile only */}
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground tabular-nums sm:hidden">
                      {new Date(b.startAt).toLocaleString("nl-NL", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" · €"}
                      {Number(b.totalPrice).toFixed(0)}
                    </p>
                  </div>
                  <div className="hidden text-right text-xs sm:block">
                    <p className="font-medium tabular-nums">
                      {new Date(b.startAt).toLocaleString("nl-NL", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-muted-foreground tabular-nums">
                      tot{" "}
                      {new Date(b.endAt).toLocaleString("nl-NL", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className="hidden text-sm font-semibold tabular-nums sm:block">
                    € {Number(b.totalPrice).toFixed(2)}
                  </span>
                </Link>
                {/* Acties + status-pill staan buiten de Link. Volgorde:
                    eerst acties, dan pill helemaal rechts — dan eindigt
                    elke rij op dezelfde rand. */}
                {(() => {
                  const d = deriveStatus(b);
                  const showDamage =
                    b.status === "COMPLETED" && b.completionDamage;
                  return (
                    <>
                      <BookingRowActions
                        bookingId={b.id}
                        derivedKey={d.key}
                      />
                      <div className="flex w-32 shrink-0 items-center justify-end gap-1.5">
                        {showDamage && (
                          <AlertTriangle
                            className="size-3.5 shrink-0 text-[oklch(0.7_0.16_60)]"
                            aria-label="Schade gemeld bij afronding"
                          />
                        )}
                        <span
                          className={`flex flex-col items-end gap-0.5 rounded-lg px-2.5 py-1 text-right ${d.cls}`}
                        >
                          <span className="text-[11px] font-semibold leading-none">
                            {d.main}
                          </span>
                          {d.sub && (
                            <span className="text-[10px] font-medium leading-none opacity-80">
                              {d.sub}
                            </span>
                          )}
                        </span>
                      </div>
                    </>
                  );
                })()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <nav className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-muted-foreground tabular-nums">
            Pagina {currentPage} van {totalPages} · {totalResults} boeking
            {totalResults === 1 ? "" : "en"}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
              aria-label="Vorige pagina"
            >
              <ChevronLeft className="size-4" />
            </button>
            {pageItems(currentPage, totalPages).map((p, i) =>
              p === "…" ? (
                <span
                  key={`gap-${i}`}
                  className="px-1 text-xs text-muted-foreground"
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPage(p)}
                  aria-current={p === currentPage ? "page" : undefined}
                  className={`inline-flex size-8 items-center justify-center rounded-lg border text-xs font-medium tabular-nums transition-colors ${
                    p === currentPage
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {p}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => onPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
              aria-label="Volgende pagina"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </nav>
      )}
    </>
  );
}
