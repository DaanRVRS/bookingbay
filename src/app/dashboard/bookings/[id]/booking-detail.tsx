"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Loader2,
  MapPin,
  Package,
  Pencil,
  StickyNote,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { BookingForm } from "../booking-form";
import { cancelBookingAction } from "@/lib/bookings/actions";
import { deriveBookingStatus, paymentSublabel } from "@/lib/bookings/status";
import { sumAddons, type BookingAddonLine } from "@/lib/bookings/price";
import type { AddonOption } from "@/lib/tenants/queries";

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
  /** Categorie + evt. parent — voor add-on-matching. */
  categoryIds?: string[];
  pricePerUnit: number | null;
  bookingIntervalMinutes: number;
  cleaningFee: number | null;
}
interface CustomerOpt {
  id: string;
  name: string;
  email: string | null;
}

interface Props {
  items: ItemOpt[];
  customers: CustomerOpt[];
  addons?: AddonOption[];
  orgSlug: string;
  accent?: string;
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
    addons: BookingAddonLine[] | null;
    paymentStatus: string | null;
    paymentProvider: string | null;
    completionDamage: boolean;
    completionNotes: string;
    completedAt: string | null;
  };
}

function deriveStatus(v: Props["view"]) {
  const d = deriveBookingStatus(v.status, v.startAt, v.endAt);
  return {
    main: d.main,
    cls: d.cls,
    sub:
      d.key === "CANCELED"
        ? null
        : paymentSublabel(v.paymentProvider, v.paymentStatus),
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

export function BookingDetail({
  items,
  customers,
  addons = [],
  view,
  orgSlug,
  accent,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [canceling, startCancel] = useTransition();

  const alreadyCanceled = view.status === "CANCELED";

  const onCancel = () => {
    startCancel(async () => {
      const res = await cancelBookingAction(view.id);
      if (res.ok) {
        toast.success("Boeking geannuleerd");
        setConfirmingCancel(false);
        setEditing(false);
        router.refresh();
      } else {
        toast.error(res.error ?? "Annuleren mislukt");
      }
    });
  };

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
          orgSlug={orgSlug}
          accent={accent}
          items={items}
          customers={customers}
          addons={addons}
          existing={{
            id: view.id,
            itemId: view.itemId,
            customerId: view.customerId,
            startAt: view.startAt,
            endAt: view.endAt,
            status: view.status,
            totalPrice: view.totalPrice,
            notes: view.notes,
            addons: view.addons,
          }}
        />

        {/* Gevarenzone — annuleren kan maar één keer, met bevestiging */}
        {!alreadyCanceled && (
          <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-destructive">
                  Boeking annuleren
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  De boeking wordt op{" "}
                  <span className="font-medium">Geannuleerd</span> gezet en de
                  reservering komt vrij. Dit kan niet ongedaan worden gemaakt.
                </p>

                {confirmingCancel ? (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={onCancel}
                      disabled={canceling}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-destructive px-4 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      {canceling && (
                        <Loader2 className="size-4 animate-spin" />
                      )}
                      Ja, definitief annuleren
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingCancel(false)}
                      disabled={canceling}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
                    >
                      Nee, behouden
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingCancel(true)}
                    className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-destructive/40 bg-background px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <X className="size-4" />
                    Annuleer boeking
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
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

      {view.addons && view.addons.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Package className="size-4" />
            <span className="text-xs font-semibold tracking-wider uppercase">
              Extra&apos;s
            </span>
          </div>
          <ul className="mt-3 flex flex-col gap-1.5">
            {view.addons.map((a) => (
              <li
                key={a.itemId}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span>
                  {a.name}
                  <span className="text-muted-foreground"> × {a.quantity}</span>
                </span>
                <span className="tabular-nums text-muted-foreground">
                  € {(a.unitPrice * a.quantity).toFixed(2)}
                </span>
              </li>
            ))}
            <li className="mt-1 flex items-center justify-between gap-3 border-t border-border pt-1.5 text-sm font-semibold">
              <span>Extra&apos;s totaal</span>
              <span className="tabular-nums">
                € {sumAddons(view.addons).toFixed(2)}
              </span>
            </li>
          </ul>
        </div>
      )}

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

      {/* Afronding — alleen na "Op voltooid" */}
      {view.status === "COMPLETED" && (
        <div
          className={`rounded-xl border p-5 ${
            view.completionDamage
              ? "border-[oklch(0.7_0.16_60)]/40 bg-[oklch(0.7_0.16_60)]/8"
              : "border-border bg-card"
          }`}
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            {view.completionDamage ? (
              <AlertTriangle className="size-4 text-[oklch(0.7_0.16_60)]" />
            ) : (
              <CheckCircle2 className="size-4 text-[oklch(0.5_0.14_150)]" />
            )}
            <span className="text-xs font-semibold tracking-wider uppercase">
              Afronding
              {view.completedAt && (
                <span className="ml-1.5 font-normal normal-case text-muted-foreground/80">
                  ·{" "}
                  {new Date(view.completedAt).toLocaleString("nl-NL", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium">
            {view.completionDamage
              ? "Schade gemeld bij oplevering."
              : "Zonder schade afgerond."}
          </p>
          {view.completionNotes && (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
              {view.completionNotes}
            </p>
          )}
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
