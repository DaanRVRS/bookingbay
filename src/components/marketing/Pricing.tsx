"use client";

import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    price: "€19",
    period: "per maand",
    description: "Voor wie net begint of klein blijft.",
    cta: "Start trial",
    href: "/register?plan=starter",
    highlighted: false,
    features: [
      "Tot 25 items",
      "2 gebruikers",
      "Subdomein op bookingbay.nl",
      "Boekings-widget voor je eigen website",
      "Basis customizer",
      "E-mail support",
    ],
  },
  {
    name: "Professional",
    price: "€49",
    period: "per maand",
    description: "Voor groeiende verhuurbedrijven.",
    cta: "Start trial",
    href: "/register?plan=professional",
    highlighted: true,
    features: [
      "Tot 150 items",
      "10 gebruikers",
      "Eigen domein + SSL",
      "Volledige customizer",
      "Prioriteit support",
      "Audit-log",
    ],
  },
  {
    name: "Business",
    price: "€99",
    period: "per maand",
    description: "Voor wie volume draait.",
    cta: "Start trial",
    href: "/register?plan=business",
    highlighted: false,
    features: [
      "Onbeperkte items",
      "Onbeperkte gebruikers",
      "Onbeperkt pagina's in builder",
      "Eigen domein + SSL",
      "Verberg \"Powered by BookingBay\"",
      "Prioriteit support",
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative border-t border-border bg-muted/30 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Prijzen</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Eerlijk geprijsd. Geen verrassingen.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            14 dagen gratis proberen. Daarna stop wanneer je wil — geen jaarcontracten.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-card p-7",
                plan.highlighted
                  ? "border-primary/50 shadow-[0_24px_60px_-30px_color-mix(in_oklch,var(--primary)_60%,transparent)] lg:scale-[1.02]"
                  : "border-border",
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  <Sparkles className="size-3" />
                  Meest gekozen
                </span>
              )}

              <div>
                <h3 className="text-xl font-semibold tracking-tight">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
                <span className="text-sm text-muted-foreground">/ {plan.period}</span>
              </div>

              <ul className="mt-6 space-y-2.5 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                      <Check className="size-3" />
                    </span>
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={cn(
                  "mt-7 inline-flex h-11 items-center justify-center rounded-lg font-medium transition-all active:translate-y-px",
                  plan.highlighted
                    ? "bg-primary text-primary-foreground shadow-sm hover:shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--primary)_55%,transparent)]"
                    : "border border-border bg-background hover:bg-accent",
                )}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Alle plannen bevatten de <strong className="text-foreground">boekings-widget</strong>{" "}
          en je <strong className="text-foreground">eigen klantsite</strong> op bookingbay.nl —
          ook op Starter.
        </p>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Meer dan 500 items of speciale eisen?{" "}
          <Link
            href="/contact?topic=anders"
            className="text-foreground underline underline-offset-4"
          >
            Praat met ons
          </Link>{" "}
          over Enterprise.
        </p>
      </div>
    </section>
  );
}
