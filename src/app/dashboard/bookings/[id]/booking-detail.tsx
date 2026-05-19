"use client";

import { useState } from "react";
import {
  CalendarClock,
  CreditCard,
  MapPin,
  Package,
  Pencil,
  StickyNote,
  User,
  X,
} from "lucide-react";
import { BookingForm } from "../booking-form";

type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELED";

interface ItemOpt {
  id: string;
  name: string;
  categoryName: string;
  pricePerHour: number | null;
  pricePerDay: number | null;
  pricePerWeek: number | null;
}
interface CustomerOpt {
  id: string;
  name: string;
  email: string | null;
}

interface Props {
  items: ItemOpt[];
  customers: CustomerOpt[];
  view: {
    id: string;
    itemId: string;
    customerId: string;
    itemName: string;
    customerName: string;
    customerEmail: string | null;
    startAt: string; // ISO
    endAt: string; // ISO
    status: BookingStatus;
    totalPrice: number;
    notes: string;
    paymentStatus: string | null;
    paymentProvider: string | null;
  };
}

function deriveStatus(v: Props["view"]) {
  if (v.status === "CANCELED")
    return { main: "Geannuleerd", sub: null, cls: "bg-destructive/10 text-destructive" };
  if (v.status === "COMPLETED")
    return { main: "Voltooid", sub: null, cls: "bg-muted text-muted-foreground" };
  const paidOnline =
    Boolean(v.paymentProvider) && v.paymentStatus === "PAID";
  if (paidOnline)
    return {
      main: "Gereserveerd",
      sub: "Online betaald",
      cls: "bg-[oklch(0.7_0.13_150)]/15 text-[oklch(0.48_0.14_150)]",
    };
  return {
    main: "Gereserveerd",
    sub: "Betalen op locatie",
    cls: "bg-[oklch(0.85_0.13_85)]/22 text-[oklch(0.45_0.13_70)]",
  };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function durationLabel(a: string, b: string) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (ms <= 0) return "—";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.round((ms % 86_400_000) / 3_600_000);
  if (days > 0) return `${days} ${days === 1 ? "dag" : "dagen"}${hours ? ` ${hours} u` : ""}`;
  return `${hours} uur`;
}

export function BookingDetail({ items, customers, view }: Props) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-3.5" />
          Bewerken annuleren
        </button>
        <BookingForm
          items={items}
          customers={customers}
          existing={{
            id: view.id,
            itemId: view.itemId,
            customerId: view.customerId,
            startAt: view.startAt,
            endAt: view.endAt,
            status: view.status,
            totalPrice: view.totalPrice,
            notes: view.notes,
          }}
        />
      </div>
    );
  }

  const st = deriveStatus(view);
  const sameDay =
    new Date(view.startAt).toDateString() ===
    new Date(view.endAt).toDateString();

  return (
    <div className="flex flex-col gap-4">
      {/* Kop met status + bewerk-knop */}
      <div className="flex items-start justify-between gap-4">
        <span
          className={`flex flex-col gap-0.5 rounded-lg px-3 py-1.5 ${st.cls}`}
        >
          <span className="text-xs font-semibold leading-none">{st.main}</span>
          {st.sub && (
            <span className="text-[10px] font-medium leading-none opacity-80">
              {st.sub}
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
        >
          <Pencil className="size-4" />
          Bewerken
        </button>
      </div>

      {/* Wanneer — groot en duidelijk */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-5 py-2.5">
          <CalendarClock className="size-4 text-primary" />
          <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
            Wanneer
          </span>
        </div>
        <div className="p-5">
          {sameDay ? (
            <>
              <p className="text-lg font-semibold tracking-tight">
                {fmtDate(view.startAt)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                {fmtTime(view.startAt)} — {fmtTime(view.endAt)}{" "}
                <span className="text-muted-foreground/70">
                  · {durationLabel(view.startAt, view.endAt)}
                </span>
              </p>
            </>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
              <div>
                <p className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
                  Van
                </p>
                <p className="text-base font-semibold tracking-tight">
                  {fmtDate(view.startAt)}
                </p>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {fmtTime(view.startAt)}
                </p>
              </div>
              <div className="hidden text-muted-foreground sm:block">→</div>
              <div>
                <p className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
                  Tot
                </p>
                <p className="text-base font-semibold tracking-tight">
                  {fmtDate(view.endAt)}
                </p>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {fmtTime(view.endAt)}
                </p>
              </div>
              <div className="sm:ml-auto">
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  {durationLabel(view.startAt, view.endAt)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Details grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <InfoCard icon={Package} label="Item" value={view.itemName} />
        <InfoCard
          icon={User}
          label="Klant"
          value={view.customerName}
          sub={view.customerEmail ?? undefined}
        />
        <InfoCard
          icon={view.paymentProvider ? CreditCard : MapPin}
          label="Betaling"
          value={
            view.paymentProvider
              ? view.paymentStatus === "PAID"
                ? "Online betaald"
                : "Online — nog niet voldaan"
              : "Op locatie"
          }
          sub={
            view.paymentProvider
              ? view.paymentProvider.charAt(0).toUpperCase() +
                view.paymentProvider.slice(1)
              : "Bij ophalen"
          }
        />
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-xs font-semibold tracking-wider uppercase">
              Totaalbedrag
            </span>
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-primary">
            € {view.totalPrice.toFixed(2)}
          </p>
        </div>
      </div>

      {view.notes && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <StickyNote className="size-4" />
            <span className="text-xs font-semibold tracking-wider uppercase">
              Opmerkingen
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-line">
            {view.notes}
          </p>
        </div>
      )}
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Package;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs font-semibold tracking-wider uppercase">
          {label}
        </span>
      </div>
      <p className="mt-2 truncate text-base font-semibold tracking-tight">
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>
      )}
    </div>
  );
}
