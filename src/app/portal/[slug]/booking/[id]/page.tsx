import { notFound } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Hourglass,
  Mail,
  Phone,
  Plus,
  Receipt,
  StickyNote,
  XCircle,
} from "lucide-react";
import { db } from "@/lib/db";
import {
  flatFeeLines,
  sumFlatFees,
  sumAddons,
  rentalUnitCount,
  type BookingAddonLine,
} from "@/lib/bookings/price";
import { CancelButton } from "./cancel-button";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ token?: string }>;
}

export const metadata = {
  title: "Mijn boeking",
  robots: { index: false, follow: false },
};

export default async function PortalBookingPage({ params, searchParams }: PageProps) {
  const { slug, id } = await params;
  const { token } = await searchParams;

  if (!token) notFound();

  const booking = await db.booking.findUnique({
    where: { id },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      status: true,
      paymentStatus: true,
      totalPrice: true,
      addons: true,
      notes: true,
      portalToken: true,
      item: {
        select: {
          name: true,
          description: true,
          imageUrl: true,
          bookingIntervalMinutes: true,
          cleaningFee: true,
          captainFee: true,
          fuelFee: true,
        },
      },
      customer: { select: { name: true, email: true, phone: true } },
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          contactEmail: true,
          contactPhone: true,
          customerPortalEnabled: true,
          customerPortalCancelHoursMin: true,
        },
      },
    },
  });

  // Token-check via timing-safe vergelijking (zelfde als de cancel-route).
  // We verklappen niet via een 404 of de boeking-id bestaat — alleen dat
  // de link niet werkt.
  if (
    !booking ||
    booking.organization.slug !== slug ||
    !booking.portalToken ||
    !safeEqual(booking.portalToken, token)
  ) {
    notFound();
  }
  if (!booking.organization.customerPortalEnabled) notFound();

  const org = booking.organization;
  // Het portaal is BookingBay-infrastructuur (net als de bevestigingsmail),
  // geen tenant-site — dus altijd het BookingBay-oranje, bewust losgekoppeld
  // van de accent-kleur van de klantensite.
  const accent = "#ef5934";
  const now = new Date();
  const isUpcoming =
    booking.startAt > now &&
    booking.status !== "CANCELED" &&
    booking.status !== "COMPLETED";
  const hoursUntil = (booking.startAt.getTime() - now.getTime()) / (60 * 60 * 1000);
  const canCancel =
    isUpcoming && hoursUntil >= org.customerPortalCancelHoursMin;
  const totalEur = Number(booking.totalPrice);
  const units = rentalUnitCount(
    booking.startAt.getTime(),
    booking.endAt.getTime(),
    booking.item.bookingIntervalMinutes,
  );
  const feeLines = flatFeeLines(booking.item, units);
  const feesTotal = sumFlatFees(booking.item, units);
  // Add-ons (extra's) zitten ook in totalPrice — apart aftrekken zodat het
  // "Huurprijs"-bedrag zuiver de huur is en het totaal verklaarbaar blijft.
  const addonList = (booking.addons as BookingAddonLine[] | null) ?? [];
  const addonsTotal = sumAddons(addonList);
  const subtotalEur = Math.max(0, totalEur - feesTotal - addonsTotal);
  const showBreakdown = feesTotal > 0 || addonsTotal > 0;

  return (
    <main className="relative min-h-dvh">
      {/* Accent-gloed bovenin — zelfde sfeer als de boek-widget */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-80"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${accent}2E 0%, transparent 65%)`,
        }}
      />

      <div className="relative mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Merk-header — zelfde opzet als de widget */}
        <header className="flex items-center gap-3">
          {org.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={org.logoUrl}
              alt={org.name}
              width={44}
              height={44}
              className="size-11 shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-border"
            />
          ) : (
            <div
              className="grid size-11 shrink-0 place-items-center rounded-xl text-sm font-bold text-white shadow-sm"
              style={{
                background: accent,
                boxShadow: `0 4px 14px -4px ${accent}80`,
              }}
            >
              {org.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p
              className="text-[10px] font-semibold tracking-wider uppercase"
              style={{ color: accent }}
            >
              Je boeking bij
            </p>
            <p className="truncate text-lg font-bold tracking-tight">
              {org.name}
            </p>
          </div>
        </header>

        <p className="mt-5 text-sm text-muted-foreground">
          Hoi <span className="font-medium text-foreground">{booking.customer.name}</span>{" "}
          — hier vind je alle details van je boeking. Bewaar deze link: hij
          blijft werken.
        </p>

        {/* Hoofdkaart */}
        <section className="mt-5 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_18px_50px_-28px_rgba(0,0,0,0.25)]">
          {/* Item-kop met accent-tint */}
          <div
            className="flex items-start justify-between gap-3 border-b border-border px-6 py-5"
            style={{
              background: `linear-gradient(135deg, ${accent}14 0%, transparent 70%)`,
            }}
          >
            <div className="min-w-0">
              <p className="text-lg font-semibold tracking-tight">
                {booking.item.name}
              </p>
              {booking.item.description && (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {booking.item.description}
                </p>
              )}
            </div>
            <StatusPill
              status={booking.status}
              paymentStatus={booking.paymentStatus}
            />
          </div>

          {/* Wanneer — tegels */}
          <div className="grid gap-3 px-6 py-5 sm:grid-cols-3">
            <InfoTile
              icon={Calendar}
              accent={accent}
              label="Datum"
              value={format(booking.startAt, "EEEE d MMMM", { locale: nl })}
              sub={format(booking.startAt, "yyyy")}
            />
            <InfoTile
              icon={Clock}
              accent={accent}
              label="Tijd"
              value={`${format(booking.startAt, "HH:mm")} — ${format(booking.endAt, "HH:mm")}`}
            />
            <InfoTile
              icon={Hourglass}
              accent={accent}
              label="Duur"
              value={durationLabel(booking.startAt, booking.endAt)}
            />
          </div>

          {/* Prijsopbouw */}
          <div className="border-t border-border px-6 py-5">
            <div className="mb-3 flex items-center gap-2">
              <span
                className="grid size-6 place-items-center rounded-md"
                style={{ background: `${accent}18`, color: accent }}
              >
                <Receipt className="size-3.5" />
              </span>
              <span className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
                Prijs
              </span>
            </div>
            <dl className="flex flex-col gap-1.5 text-sm">
              {showBreakdown && (
                <PriceRow label="Huurprijs" amount={subtotalEur} />
              )}
              {feeLines.map((l) => (
                <PriceRow key={l.label} label={l.label} amount={l.amount} />
              ))}
              {addonList.map((a) => (
                <PriceRow
                  key={a.itemId}
                  label={`${a.name}${a.quantity > 1 ? ` ×${a.quantity}` : ""}`}
                  amount={a.unitPrice * a.quantity}
                  icon={<Plus className="size-3 text-muted-foreground" />}
                />
              ))}
              <div className="mt-2 flex items-baseline justify-between border-t border-border pt-3">
                <dt className="text-sm font-semibold">Totaal</dt>
                <dd className="flex items-center gap-2">
                  <span
                    className="text-xl font-semibold tabular-nums"
                    style={{ color: accent }}
                  >
                    €{totalEur.toFixed(2).replace(".", ",")}
                  </span>
                  {booking.paymentStatus === "PAID" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.93_0.07_150)] px-2 py-0.5 text-[10px] font-semibold text-[oklch(0.4_0.14_150)]">
                      <CheckCircle2 className="size-3" />
                      Betaald
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {booking.notes && (
            <div className="border-t border-border px-6 py-5">
              <div className="flex items-start gap-2.5 rounded-lg bg-muted/40 p-3">
                <StickyNote className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 text-xs">
                  <p className="font-semibold">Jouw opmerking</p>
                  <p className="mt-0.5 whitespace-pre-line text-muted-foreground">
                    {booking.notes}
                  </p>
                </div>
              </div>
            </div>
          )}

          {(canCancel || isUpcoming) && (
            <div className="border-t border-border bg-muted/20 px-6 py-5">
              {canCancel ? (
                <CancelButton slug={slug} bookingId={booking.id} token={token} />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Annuleren kan tot {org.customerPortalCancelHoursMin}u vóór de
                  starttijd. Bel of mail anders direct met {org.name}.
                </p>
              )}
            </div>
          )}
        </section>

        {/* Contact */}
        {(org.contactPhone || org.contactEmail) && (
          <section className="mt-4 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold tracking-tight">
              Vragen over je boeking?
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {org.name} helpt je graag.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {org.contactPhone && (
                <a
                  href={`tel:${org.contactPhone}`}
                  className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-lg"
                    style={{ background: `${accent}18`, color: accent }}
                  >
                    <Phone className="size-4" />
                  </span>
                  {org.contactPhone}
                </a>
              )}
              {org.contactEmail && (
                <a
                  href={`mailto:${org.contactEmail}`}
                  className="flex min-w-0 items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-lg"
                    style={{ background: `${accent}18`, color: accent }}
                  >
                    <Mail className="size-4" />
                  </span>
                  <span className="truncate">{org.contactEmail}</span>
                </a>
              )}
            </div>
          </section>
        )}

        <p className="mt-8 text-center text-[11px] text-muted-foreground">
          Boeking-id <code className="font-mono">{booking.id.slice(-8)}</code>
          {" · "}Powered by{" "}
          <a
            href="https://www.bookingbay.nl"
            className="font-medium hover:text-foreground"
          >
            BookingBay
          </a>
        </p>
      </div>
    </main>
  );
}

function durationLabel(start: Date, end: Date): string {
  const ms = end.getTime() - start.getTime();
  if (ms <= 0) return "—";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const mins = Math.round((ms % 3_600_000) / 60_000);
  if (days > 0) return `${days} ${days === 1 ? "dag" : "dagen"}${hours ? ` ${hours}u` : ""}`;
  if (hours > 0) return `${hours}u${mins ? ` ${mins}m` : ""}`;
  return `${mins} min`;
}

function InfoTile({
  icon: Icon,
  accent,
  label,
  value,
  sub,
}: {
  icon: typeof Calendar;
  accent: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3.5">
      <span
        className="grid size-8 place-items-center rounded-lg"
        style={{ background: `${accent}18`, color: accent }}
      >
        <Icon className="size-4" />
      </span>
      <p className="mt-2.5 text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold capitalize">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function PriceRow({
  label,
  amount,
  icon,
}: {
  label: string;
  amount: number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="tabular-nums">€{amount.toFixed(2).replace(".", ",")}</dd>
    </div>
  );
}

function StatusPill({
  status,
  paymentStatus,
}: {
  status: string;
  paymentStatus: string | null;
}) {
  if (status === "CANCELED") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-[10px] font-semibold text-destructive">
        <XCircle className="size-3" />
        Geannuleerd
      </span>
    );
  }
  if (status === "COMPLETED") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[oklch(0.93_0.07_150)] px-2.5 py-1 text-[10px] font-semibold text-[oklch(0.4_0.14_150)]">
        <CheckCircle2 className="size-3" />
        Voltooid
      </span>
    );
  }
  if (paymentStatus === "PAID" || status === "CONFIRMED") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[oklch(0.93_0.07_150)] px-2.5 py-1 text-[10px] font-semibold text-[oklch(0.4_0.14_150)]">
        <CheckCircle2 className="size-3" />
        {paymentStatus === "PAID" ? "Betaald" : "Bevestigd"}
      </span>
    );
  }
  // PENDING = op-locatie-boeking. Die staat gewoon vast (slot geblokkeerd,
  // bevestigingsmail verstuurd) — het dashboard toont 'm ook als
  // "Gereserveerd" en er bestaat geen aparte bevestig-stap. "Wacht op
  // bevestiging" tonen zou de klant dus eeuwig laten wachten op niets.
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[oklch(0.93_0.07_150)] px-2.5 py-1 text-[10px] font-semibold text-[oklch(0.4_0.14_150)]">
      <CheckCircle2 className="size-3" />
      Gereserveerd
    </span>
  );
}

/** Timing-safe string-vergelijking voor de portal-token. */
function safeEqual(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
