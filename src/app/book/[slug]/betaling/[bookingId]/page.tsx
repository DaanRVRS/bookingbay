import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Calendar, Clock, CreditCard, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { getOrgBySlug } from "@/lib/tenants/queries";
import { AutoRefresh, RefreshStatusButton } from "./refresh-status";

// Altijd de actuele paymentStatus lezen — deze pagina wordt ge-refresht
// terwijl de Mollie-webhook de status bijwerkt.
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string; bookingId: string }>;
  searchParams: Promise<{ status?: string }>;
}

export const metadata = {
  title: "Boeking-status",
  robots: { index: false, follow: false },
};

export default async function PaymentReturnPage({
  params,
  searchParams,
}: PageProps) {
  const { slug, bookingId } = await params;
  const { status: statusParam } = await searchParams;

  const org = await getOrgBySlug(slug);
  if (!org) notFound();

  const booking = await db.booking.findFirst({
    where: { id: bookingId, organizationId: org.id },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      portalToken: true,
      startAt: true,
      endAt: true,
      totalPrice: true,
      item: { select: { name: true } },
      organization: { select: { customerPortalEnabled: true } },
    },
  });
  if (!booking) notFound();

  // Permanente overzicht-link (zelfde link als in de bevestigingsmail).
  const portalUrl =
    booking.portalToken && booking.organization.customerPortalEnabled
      ? `/portal/${slug}/booking/${booking.id}?token=${encodeURIComponent(booking.portalToken)}`
      : null;

  const accent = org.primaryColor ?? "#ef5934";

  const isPaid = booking.paymentStatus === "PAID";
  const isCanceled = statusParam === "annulered" || booking.status === "CANCELED";
  const variant = isPaid ? "paid" : isCanceled ? "canceled" : "pending";

  const config = {
    paid: {
      title: "Betaling gelukt",
      body: `Je boeking bij ${org.name} is bevestigd. Je ontvangt de details per e-mail.`,
    },
    canceled: {
      title: "Betaling geannuleerd",
      body: `Je boeking is niet voltooid. Probeer het opnieuw of neem contact op met ${org.name}.`,
    },
    pending: {
      title: "Betaling wordt verwerkt",
      body: "Dit duurt meestal minder dan een minuut — deze pagina ververst vanzelf.",
    },
  }[variant];

  const totalEur = Number(booking.totalPrice);

  return (
    <main className="relative min-h-dvh">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-80"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${accent}2E 0%, transparent 65%)`,
        }}
      />
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 py-12 sm:px-6">
        {/* Merk-header */}
        <div className="mb-8 flex items-center gap-3">
          {org.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={org.logoUrl}
              alt={org.name}
              width={40}
              height={40}
              className="size-10 shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-border"
            />
          ) : (
            <div
              className="grid size-10 shrink-0 place-items-center rounded-xl text-sm font-bold text-white shadow-sm"
              style={{
                background: accent,
                boxShadow: `0 4px 14px -4px ${accent}80`,
              }}
            >
              {org.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 text-left">
            <p
              className="text-[10px] font-semibold tracking-wider uppercase"
              style={{ color: accent }}
            >
              Je boeking bij
            </p>
            <p className="truncate text-sm font-bold tracking-tight">
              {org.name}
            </p>
          </div>
        </div>

        {/* Status-icoon */}
        {variant === "paid" && (
          <span
            className="bb-success-pop grid size-16 place-items-center rounded-full text-white shadow-lg"
            style={{
              background: accent,
              boxShadow: `0 8px 24px -6px ${accent}80`,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-8"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 12.5l4.5 4.5L19 7" pathLength={1} className="bb-success-check" />
            </svg>
          </span>
        )}
        {variant === "pending" && (
          <span
            className="grid size-16 place-items-center rounded-full text-white shadow-lg"
            style={{
              background: "oklch(0.65 0.13 80)",
              boxShadow: "0 8px 24px -6px oklch(0.65 0.13 80 / 0.5)",
            }}
          >
            <Clock className="size-8 animate-pulse" />
          </span>
        )}
        {variant === "canceled" && (
          <span
            className="grid size-16 place-items-center rounded-full text-white shadow-lg"
            style={{
              background: "oklch(0.62 0.18 25)",
              boxShadow: "0 8px 24px -6px oklch(0.62 0.18 25 / 0.5)",
            }}
          >
            <XCircle className="size-8" />
          </span>
        )}

        <h1 className="mt-5 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          {config.title}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-center text-sm text-muted-foreground">
          {config.body}
        </p>

        {/* Boeking-samenvatting — de klant ziet meteen wát er geboekt is */}
        <div className="mt-7 w-full overflow-hidden rounded-2xl border border-border bg-card text-left shadow-[0_18px_50px_-28px_rgba(0,0,0,0.25)]">
          <div
            className="border-b border-border px-5 py-3.5"
            style={{
              background: `linear-gradient(135deg, ${accent}14 0%, transparent 70%)`,
            }}
          >
            <p className="text-sm font-semibold tracking-tight">
              {booking.item.name}
            </p>
          </div>
          <dl className="flex flex-col gap-2.5 px-5 py-4 text-sm">
            <div className="flex items-center gap-2.5">
              <Calendar className="size-4 shrink-0 text-muted-foreground" />
              <dd className="capitalize">
                {format(booking.startAt, "EEEE d MMMM yyyy", { locale: nl })}
              </dd>
            </div>
            <div className="flex items-center gap-2.5">
              <Clock className="size-4 shrink-0 text-muted-foreground" />
              <dd className="tabular-nums">
                {format(booking.startAt, "HH:mm")} — {format(booking.endAt, "HH:mm")}
              </dd>
            </div>
            <div className="flex items-center gap-2.5">
              <CreditCard className="size-4 shrink-0 text-muted-foreground" />
              <dd className="font-semibold tabular-nums" style={{ color: accent }}>
                €{totalEur.toFixed(2).replace(".", ",")}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          {isPaid && portalUrl && (
            <Link
              href={portalUrl}
              className="inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5"
              style={{
                background: accent,
                boxShadow: `0 4px 14px -4px ${accent}80`,
              }}
            >
              Boeking-overzicht
            </Link>
          )}
          {variant === "pending" && (
            <>
              <RefreshStatusButton accent={accent} />
              {/* Zolang de betaling pending is elke 5s de status opnieuw
                  lezen — klapt vanzelf om naar "gelukt" zodra de webhook
                  binnen is. */}
              <AutoRefresh />
            </>
          )}
          {variant === "canceled" && (
            <Link
              href={`/book/${slug}`}
              className="inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold text-white shadow-sm"
              style={{ background: accent }}
            >
              Opnieuw proberen
            </Link>
          )}
          <Link
            href={`/book/${slug}`}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-card px-5 text-sm font-medium hover:bg-accent"
          >
            Nieuwe boeking
          </Link>
        </div>

        {isPaid && portalUrl && (
          <p className="mt-4 max-w-sm text-center text-[11px] leading-relaxed text-muted-foreground">
            Je overzicht is altijd bereikbaar via de link in je
            bevestigingsmail — geen account nodig.
          </p>
        )}

        <p className="mt-8 text-[11px] text-muted-foreground">
          Boeking-id: <code className="font-mono">{booking.id.slice(-8)}</code>
        </p>
      </div>
    </main>
  );
}
