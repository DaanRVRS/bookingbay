import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { getOrgBySlug } from "@/lib/tenants/queries";

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
      item: { select: { name: true } },
    },
  });
  if (!booking) notFound();

  const accent = org.primaryColor ?? "#ef5934";

  const isPaid = booking.paymentStatus === "PAID";
  const isCanceled = statusParam === "annulered" || booking.status === "CANCELED";
  const variant = isPaid ? "paid" : isCanceled ? "canceled" : "pending";

  const config = {
    paid: {
      icon: CheckCircle2,
      title: "Betaling gelukt",
      body: `Je boeking voor ${booking.item.name} is bevestigd. ${org.name} stuurt je verdere details per e-mail.`,
      bg: accent,
    },
    canceled: {
      icon: XCircle,
      title: "Betaling geannuleerd",
      body: `Je boeking is niet voltooid. Probeer het opnieuw of neem contact op met ${org.name}.`,
      bg: "oklch(0.62 0.18 25)",
    },
    pending: {
      icon: Clock,
      title: "Betaling wordt verwerkt",
      body: `${org.name} ontvangt automatisch bericht zodra de betaling rond is — meestal binnen een minuut.`,
      bg: "oklch(0.65 0.13 80)",
    },
  }[variant];

  const Icon = config.icon;

  return (
    <main className="relative min-h-dvh">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${accent}25 0%, transparent 65%)`,
        }}
      />
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 py-12 text-center sm:px-6">
        <span
          className="grid size-16 place-items-center rounded-full text-white shadow-lg"
          style={{
            background: config.bg,
            boxShadow: `0 8px 24px -6px ${config.bg}80`,
          }}
        >
          <Icon className="size-8" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
          {config.title}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
          {config.body}
        </p>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/book/${slug}`}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-card px-5 text-sm font-medium hover:bg-accent"
          >
            Nieuwe boeking
          </Link>
          {!isPaid && variant !== "canceled" && (
            <Link
              href={`/book/${slug}`}
              className="inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold text-white shadow-sm"
              style={{ background: accent }}
            >
              Status verversen
            </Link>
          )}
        </div>

        <p className="mt-10 text-[11px] text-muted-foreground">
          Boeking-id: <code className="font-mono">{booking.id.slice(-8)}</code>
        </p>
      </div>
    </main>
  );
}
