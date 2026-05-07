import Link from "next/link";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { AlertTriangle, Clock } from "lucide-react";

interface Props {
  paidUntil: Date | null;
  suspendedAt: Date | null;
}

export function SubscriptionBanner({ paidUntil, suspendedAt }: Props) {
  const now = new Date();

  if (suspendedAt) {
    return (
      <div className="border-b border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <AlertTriangle className="size-4 shrink-0 text-destructive" />
          <p className="flex-1 text-destructive">
            <strong className="font-semibold">Abonnement gestopt</strong> — er is
            geen betaling ontvangen. Je data blijft 30 dagen bewaard.
          </p>
          <Link
            href="/dashboard/settings/billing"
            className="shrink-0 rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:opacity-90"
          >
            Hervatten
          </Link>
        </div>
      </div>
    );
  }

  if (!paidUntil) return null;

  const msLeft = paidUntil.getTime() - now.getTime();
  const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));

  // Past due but not yet suspended (within grace window)
  if (msLeft <= 0) {
    return (
      <div className="border-b border-[oklch(0.85_0.13_85)]/50 bg-[oklch(0.97_0.05_80)] px-4 py-2.5 text-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Clock className="size-4 shrink-0 text-[oklch(0.5_0.16_70)]" />
          <p className="flex-1 text-[oklch(0.4_0.13_70)]">
            <strong className="font-semibold">Betaling te laat</strong> —
            verlengdatum was{" "}
            {format(paidUntil, "d MMMM", { locale: nl })}. Je hebt nog enkele
            dagen voordat het abonnement automatisch stopt.
          </p>
          <Link
            href="/dashboard/settings/billing"
            className="shrink-0 rounded-md bg-[oklch(0.6_0.16_70)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            Bekijk
          </Link>
        </div>
      </div>
    );
  }

  // Approaching renewal (≤ 3 days)
  if (daysLeft <= 3) {
    const label =
      daysLeft <= 1
        ? "morgen"
        : `over ${daysLeft} dagen (${format(paidUntil, "EEE d MMM", { locale: nl })})`;
    return (
      <div className="border-b border-primary/30 bg-primary/8 px-4 py-2.5 text-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Clock className="size-4 shrink-0 text-primary" />
          <p className="flex-1 text-foreground">
            Je abonnement verlengt {label}.
          </p>
          <Link
            href="/dashboard/settings/billing"
            className="shrink-0 rounded-md border border-primary/40 bg-background px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
          >
            Naar facturatie
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
