import Link from "next/link";
import { Sparkles } from "lucide-react";

/**
 * Compacte trial-status pill in de dashboard topbar.
 * Verschijnt alleen als trialEndsAt in de toekomst ligt en de org nog
 * geen `paidUntil` heeft (na betaling stoppen we de trial-melding).
 */
export function TrialPill({
  trialEndsAt,
  paidUntil,
}: {
  trialEndsAt: Date | null;
  paidUntil: Date | null;
}) {
  if (!trialEndsAt) return null;
  // Once paidUntil is set we treat the org as paying — hide the trial label.
  if (paidUntil) return null;

  const now = Date.now();
  const msLeft = trialEndsAt.getTime() - now;
  if (msLeft <= 0) {
    return (
      <Link
        href="/dashboard/settings/billing"
        className="hidden items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/15 sm:inline-flex"
        title="Trial verlopen — verleng je abonnement"
      >
        <Sparkles className="size-3" />
        Trial verlopen
      </Link>
    );
  }

  const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
  const urgent = daysLeft <= 3;
  const label =
    daysLeft === 1 ? "Nog 1 dag trial" : `Nog ${daysLeft} dagen trial`;

  return (
    <Link
      href="/dashboard/settings/billing"
      className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors sm:inline-flex ${
        urgent
          ? "border border-[oklch(0.85_0.13_85)]/50 bg-[oklch(0.97_0.05_80)] text-[oklch(0.4_0.13_70)] hover:bg-[oklch(0.95_0.08_80)]"
          : "border border-primary/30 bg-primary/8 text-primary hover:bg-primary/12"
      }`}
      title="Bekijk je plan & facturatie"
    >
      <Sparkles className="size-3" />
      {label}
    </Link>
  );
}
