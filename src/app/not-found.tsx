import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

export const metadata = { title: "Niet gevonden — BookingBay" };

export default function NotFound() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 20%, color-mix(in oklch, var(--primary) 14%, transparent) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -bottom-32 -z-10 h-64 opacity-50"
        style={{
          background:
            "radial-gradient(ellipse 60% 100% at 50% 100%, color-mix(in oklch, var(--primary) 10%, transparent) 0%, transparent 70%)",
        }}
      />

      <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <span
          className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary)_20%,transparent)]"
          aria-hidden
        >
          <Search className="size-7" />
        </span>

        <p className="mt-6 text-[11px] font-semibold tracking-[0.18em] uppercase text-primary">
          404 · Niet gevonden
        </p>
        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Deze pagina bestaat niet — of niet meer.
        </h1>
        <p className="mt-4 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
          Misschien een typfout in de URL, of de link is verlopen. Geen zorgen,
          we helpen je terug.
        </p>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/"
            className="group inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--primary)_55%,transparent)] active:translate-y-0"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            Naar de homepage
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-card px-5 text-sm font-medium hover:bg-accent"
          >
            Neem contact op
          </Link>
        </div>

        <p className="mt-10 text-[11px] text-muted-foreground">
          Hulp nodig? Mail{" "}
          <a
            href="mailto:hallo@bookingbay.nl"
            className="font-medium text-foreground hover:underline"
          >
            hallo@bookingbay.nl
          </a>
        </p>
      </div>
    </main>
  );
}
