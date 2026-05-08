import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export const metadata = {
  title: "Over BookingBay",
  description:
    "BookingBay maakt verhuur-administratie eenvoudiger voor Nederlandse verhuurbedrijven.",
};

export default function OverPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="text-sm font-medium text-primary">Over ons</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Verhuur zonder gedoe — daar zijn wij van.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            BookingBay is een Nederlands platform voor verhuurbedrijven. We
            zagen dat veel ondernemers worstelen met losse Excel-bestanden,
            onhandige boekingsystemen en website-bouwers die niet voor verhuur
            zijn ontworpen. Daarom hebben we BookingBay gemaakt: één plek voor
            je planning, je klanten, en een eigen boekingssite die past bij je
            merk.
          </p>

          <div className="mt-12 grid gap-8 sm:grid-cols-2">
            <Block
              title="Voor verhuur"
              body="We bouwen niet voor algemene boekingen of afspraken — we bouwen specifiek voor mensen die spullen, voertuigen of locaties verhuren. Daardoor passen alle features."
            />
            <Block
              title="Eerlijk en transparant"
              body="Geen jaarcontracten, geen verborgen kosten. Je betaalt vooraf voor de komende maand, en stopt wanneer je wil."
            />
            <Block
              title="Privacy-first"
              body="Hosting in Europa (Hetzner, Duitsland), AVG-proof, dagelijkse encrypted back-ups. Jouw data is van jou."
            />
            <Block
              title="Nederlands"
              body="De interface, de support, en de documentatie — allemaal in het Nederlands. Vragen? We zijn bereikbaar via mail of telefoon."
            />
          </div>

          <div className="mt-14 rounded-2xl border border-border bg-card p-8">
            <h2 className="text-2xl font-semibold tracking-tight">
              Klaar om het te proberen?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Start een trial van 14 dagen. Geen creditcard nodig.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Start trial <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-border bg-background px-6 text-sm font-medium hover:bg-accent"
              >
                Neem contact op
              </Link>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
