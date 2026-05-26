import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Calendar, Clock, CheckCircle2, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { getPortalSession } from "@/lib/portal/session";
import { CancelButton } from "./cancel-button";
import { LogoutButton } from "./logout-button";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const metadata = {
  title: "Mijn boekingen",
  robots: { index: false, follow: false },
};

export default async function PortalBookingsPage({ params }: PageProps) {
  const { slug } = await params;

  const org = await db.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      primaryColor: true,
      customerPortalEnabled: true,
      customerPortalCancelHoursMin: true,
      suspendedAt: true,
    },
  });
  if (!org) notFound();
  if (!org.customerPortalEnabled || org.suspendedAt) {
    redirect(`/portal/${slug}/login`);
  }

  const session = await getPortalSession(org.id);
  if (!session) {
    redirect(`/portal/${slug}/login`);
  }

  const accent = org.primaryColor ?? "#ef5934";
  const now = new Date();

  const bookings = await db.booking.findMany({
    where: {
      organizationId: org.id,
      customer: { email: session.email },
    },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      status: true,
      paymentStatus: true,
      totalPrice: true,
      item: { select: { name: true } },
    },
    orderBy: { startAt: "desc" },
    take: 50,
  });

  const upcoming = bookings.filter(
    (b) => b.startAt > now && b.status !== "CANCELED" && b.status !== "COMPLETED",
  );
  const past = bookings.filter((b) => !upcoming.includes(b));

  return (
    <main className="relative min-h-dvh">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${accent}25 0%, transparent 65%)`,
        }}
      />
      <div className="relative mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {org.name}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Mijn boekingen
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Ingelogd als <span className="font-medium">{session.email}</span>
            </p>
          </div>
          <LogoutButton slug={org.slug} />
        </header>

        <section className="mt-8">
          <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
            Aankomend
          </h2>
          <div className="mt-3 flex flex-col gap-3">
            {upcoming.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/50 px-5 py-8 text-center text-sm text-muted-foreground">
                Geen aankomende boekingen.
              </div>
            ) : (
              upcoming.map((b) => (
                <BookingCard
                  key={b.id}
                  slug={org.slug}
                  booking={b}
                  cancelHoursMin={org.customerPortalCancelHoursMin}
                  now={now}
                />
              ))
            )}
          </div>
        </section>

        {past.length > 0 && (
          <section className="mt-10">
            <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
              Eerder
            </h2>
            <div className="mt-3 flex flex-col gap-3">
              {past.map((b) => (
                <BookingCard
                  key={b.id}
                  slug={org.slug}
                  booking={b}
                  cancelHoursMin={org.customerPortalCancelHoursMin}
                  now={now}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

type BookingRow = {
  id: string;
  startAt: Date;
  endAt: Date;
  status: string;
  paymentStatus: string | null;
  totalPrice: { toString(): string };
  item: { name: string };
};

function BookingCard({
  slug,
  booking,
  cancelHoursMin,
  now,
}: {
  slug: string;
  booking: BookingRow;
  cancelHoursMin: number;
  now: Date;
}) {
  const isUpcoming =
    booking.startAt > now &&
    booking.status !== "CANCELED" &&
    booking.status !== "COMPLETED";
  const hoursUntil = (booking.startAt.getTime() - now.getTime()) / (60 * 60 * 1000);
  const canCancel = isUpcoming && hoursUntil >= cancelHoursMin;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold tracking-tight">
            {booking.item.name}
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="size-3.5 shrink-0" />
            {format(booking.startAt, "EEEE d MMMM yyyy", { locale: nl })}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5 shrink-0" />
            {format(booking.startAt, "HH:mm")} — {format(booking.endAt, "HH:mm")}
          </p>
        </div>
        <StatusPill status={booking.status} paymentStatus={booking.paymentStatus} />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <span className="text-xs text-muted-foreground">
          €{Number(booking.totalPrice).toFixed(2).replace(".", ",")}
        </span>
        {canCancel ? (
          <CancelButton slug={slug} bookingId={booking.id} />
        ) : isUpcoming ? (
          <span className="text-[11px] text-muted-foreground">
            Annuleren kan tot {cancelHoursMin}u vooraf
          </span>
        ) : null}
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
        Betaald
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
      {status === "PENDING" ? "Wacht op bevestiging" : "Bevestigd"}
    </span>
  );
}
