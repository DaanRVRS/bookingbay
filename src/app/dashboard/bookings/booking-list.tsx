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
}

const SORT_OPTIONS = [
  { value: "created", label: "Op reserveringsdatum" },
  { value: "date", label: "Op boekingsdatum" },
];

/**
 * Eén bron van waarheid (src/lib/bookings/status.ts): hoofdlabel afgeleid van
 * tijd (Gereserveerd → Bezig → Voltooid) of handmatig Geannuleerd, plus een
 * betaal-sublabel (Online betaald / Betalen op locatie).
 */
function deriveStatus(b: Booking): {
  main: string;
  sub: string | null;
  cls: string;
} {
  const d = deriveBookingStatus(b.status, b.startAt, b.endAt);
  return {
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
}: {
  bookings: Booking[];
  currentStatus?: string;
  currentSort?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const onStatusChange = (v: string | null) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (!v || v === "__all__") sp.delete("status");
    else sp.set("status", v);
    startTransition(() => router.replace(`/dashboard/bookings?${sp.toString()}`));
  };

  const onSortChange = (v: string | null) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (!v || v === "created") sp.delete("sort");
    else sp.set("sort", v);
    startTransition(() => router.replace(`/dashboard/bookings?${sp.toString()}`));
  };

  return (
    <>
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
                  {(() => {
                    const d = deriveStatus(b);
                    return (
                      <span
                        className={`flex shrink-0 flex-col items-end gap-0.5 rounded-lg px-2.5 py-1 text-right ${d.cls}`}
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
                    );
                  })()}
                </Link>
                {(() => {
                  const d = deriveBookingStatus(
                    b.status,
                    b.startAt,
                    b.endAt,
                  );
                  return (
                    <BookingRowActions
                      bookingId={b.id}
                      derivedKey={d.key}
                    />
                  );
                })()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
