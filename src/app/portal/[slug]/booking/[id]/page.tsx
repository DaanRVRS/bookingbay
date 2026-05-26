import { notFound } from "next/navigation";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Mail,
  Phone,
  XCircle,
} from "lucide-react";
import { db } from "@/lib/db";
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
      notes: true,
      portalToken: true,
      item: { select: { name: true, description: true } },
      customer: { select: { name: true, email: true, phone: true } },
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          primaryColor: true,
          contactEmail: true,
          contactPhone: true,
          customerPortalEnabled: true,
          customerPortalCancelHoursMin: true,
          cleaningFeeEnabled: true,
          cleaningFeeCents: true,
        },
      },
    },
  });

  // Token-check via constant-length compare. We willen niet via een 404
  // verklappen of de boeking-id bestaat — alleen dat de link niet werkt.
  if (
    !booking ||
    booking.organization.slug !== slug ||
    !booking.portalToken ||
    booking.portalToken !== token
  ) {
    notFound();
  }
  if (!booking.organization.customerPortalEnabled) notFound();

  const accent = booking.organization.primaryColor ?? "#ef5934";
  const now = new Date();
  const isUpcoming =
    booking.startAt > now &&
    booking.status !== "CANCELED" &&
    booking.status !== "COMPLETED";
  const hoursUntil = (booking.startAt.getTime() - now.getTime()) / (60 * 60 * 1000);
  const canCancel =
    isUpcoming && hoursUntil >= booking.organization.customerPortalCancelHoursMin;
  const totalEur = Number(booking.totalPrice);
  const amount = `€${totalEur.toFixed(2).replace(".", ",")}`;
  const showCleaningSplit =
    booking.organization.cleaningFeeEnabled &&
    booking.organization.cleaningFeeCents > 0;
  const cleaningEur = booking.organization.cleaningFeeCents / 100;
  const subtotalEur = Math.max(0, totalEur - cleaningEur);

  return (
    <main className="relative min-h-dvh">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${accent}25 0%, transparent 65%)`,
        }}
      />
      <div className="relative mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
        <header>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {booking.organization.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Mijn boeking</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hoi {booking.customer.name} — hier vind je alle details.
          </p>
        </header>

        <section className="mt-7 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-semibold tracking-tight">
                {booking.item.name}
              </p>
              {booking.item.description && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {booking.item.description}
                </p>
              )}
            </div>
            <StatusPill
              status={booking.status}
              paymentStatus={booking.paymentStatus}
            />
          </div>

          <dl className="mt-5 grid gap-3 text-sm">
            <Row icon={Calendar} label="Datum">
              {format(booking.startAt, "EEEE d MMMM yyyy", { locale: nl })}
            </Row>
            <Row icon={Clock} label="Tijd">
              {format(booking.startAt, "HH:mm")} —{" "}
              {format(booking.endAt, "HH:mm")}
            </Row>
            <Row icon={CreditCard} label="Totaal">
              {amount}
              {booking.paymentStatus === "PAID" && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  <CheckCircle2 className="size-3" />
                  Betaald
                </span>
              )}
            </Row>
          </dl>

          {showCleaningSplit && (
            <p className="mt-3 text-xs text-muted-foreground">
              Subtotaal: €{subtotalEur.toFixed(2).replace(".", ",")} +
              schoonmaakkosten €{cleaningEur.toFixed(2).replace(".", ",")}
            </p>
          )}

          {booking.notes && (
            <div className="mt-5 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              <strong className="block text-foreground">Opmerking</strong>
              <p className="mt-1">{booking.notes}</p>
            </div>
          )}

          {canCancel && (
            <div className="mt-6 border-t border-border pt-5">
              <CancelButton slug={slug} bookingId={booking.id} token={token} />
            </div>
          )}
          {isUpcoming && !canCancel && (
            <p className="mt-6 border-t border-border pt-5 text-xs text-muted-foreground">
              Annuleren kan tot {booking.organization.customerPortalCancelHoursMin}u
              vóór de starttijd. Bel of mail anders direct met {booking.organization.name}.
            </p>
          )}
        </section>

        {(booking.organization.contactPhone || booking.organization.contactEmail) && (
          <section className="mt-5 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold tracking-tight">Contact</h2>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              {booking.organization.contactPhone && (
                <a
                  href={`tel:${booking.organization.contactPhone}`}
                  className="flex items-center gap-2 text-foreground hover:underline"
                >
                  <Phone className="size-4 text-muted-foreground" />
                  {booking.organization.contactPhone}
                </a>
              )}
              {booking.organization.contactEmail && (
                <a
                  href={`mailto:${booking.organization.contactEmail}`}
                  className="flex items-center gap-2 text-foreground hover:underline"
                >
                  <Mail className="size-4 text-muted-foreground" />
                  {booking.organization.contactEmail}
                </a>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Calendar;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="flex items-baseline gap-2">
        <dt className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </dt>
        <dd className="text-sm">{children}</dd>
      </div>
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
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-[10px] font-medium text-destructive">
        <XCircle className="size-3" />
        Geannuleerd
      </span>
    );
  }
  if (status === "COMPLETED") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
        <CheckCircle2 className="size-3" />
        Voltooid
      </span>
    );
  }
  if (paymentStatus === "PAID") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
        <CheckCircle2 className="size-3" />
        Bevestigd
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
      {status === "PENDING" ? "Wacht op bevestiging" : "Bevestigd"}
    </span>
  );
}
