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
import { STATUS_LABELS, bookingStatusValues } from "@/lib/bookings/schemas";
import type { BookingStatus } from "@prisma/client";

interface Booking {
  id: string;
  itemName: string;
  customerName: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  totalPrice: string;
}

const statusStyles: Record<BookingStatus, string> = {
  PENDING: "bg-[oklch(0.85_0.13_85)]/20 text-[oklch(0.45_0.13_70)]",
  CONFIRMED: "bg-primary/12 text-primary",
  IN_PROGRESS: "bg-[oklch(0.7_0.13_150)]/15 text-[oklch(0.5_0.14_150)]",
  COMPLETED: "bg-muted text-muted-foreground",
  CANCELED: "bg-destructive/10 text-destructive",
};

export function BookingList({
  bookings,
  currentStatus,
}: {
  bookings: Booking[];
  currentStatus?: string;
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

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          items={[
            { value: "__all__", label: "Alle statussen" },
            ...bookingStatusValues.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
          ]}
          value={currentStatus ?? "__all__"}
          onValueChange={onStatusChange}
        >
          <SelectTrigger className="sm:w-52">
            <SelectValue placeholder="Alle statussen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Alle statussen</SelectItem>
            {bookingStatusValues.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
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
                <Link
                  href={`/dashboard/bookings/${b.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.itemName}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {b.customerName}
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
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusStyles[b.status]}`}
                  >
                    {STATUS_LABELS[b.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
