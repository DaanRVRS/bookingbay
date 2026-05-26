import Link from "next/link";
import { TestTube2 } from "lucide-react";

/**
 * Verschijnt bovenaan het dashboard als de huidige user.isDemo = true.
 * Geel-getint omdat dit een neutraal "info-state" is, niet kritiek.
 */
export function DemoBanner() {
  return (
    <div className="border-b border-[oklch(0.85_0.13_85)]/40 bg-[oklch(0.985_0.025_80)] px-4 py-2.5 text-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 text-foreground">
        <TestTube2 className="size-4 shrink-0 text-[oklch(0.5_0.16_70)]" />
        <p className="flex-1">
          <strong className="text-[oklch(0.45_0.14_70)]">Demo-omgeving</strong>{" "}
          — je werkt in je eigen privé-proefomgeving. Wijzigingen blijven bij
          jou en worden na 7 dagen automatisch gewist.
        </p>
        <Link
          href="/register"
          className="ml-auto shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          Echte account aanmaken
        </Link>
      </div>
    </div>
  );
}
