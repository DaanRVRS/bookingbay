"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

export function CtaStrip() {
  return (
    <section className="relative overflow-hidden border-t border-border py-4">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative my-16 overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center shadow-[0_30px_80px_-30px_color-mix(in_oklch,var(--primary)_60%,transparent)] sm:px-12 sm:py-20"
        >
          {/* Merk-textuur op de oranje band */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "22px 22px",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-white/15 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-16 size-72 rounded-full bg-black/10 blur-3xl"
          />

          <div className="relative mx-auto max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.2em] text-primary-foreground/70 uppercase">
              BookingBay
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-primary-foreground sm:text-4xl">
              Klaar voor een vollere agenda?
            </h2>
            <p className="mt-4 text-lg text-pretty text-primary-foreground/85">
              Begin gratis. Zet je vloot of voorraad klaar. Geef klanten een
              eigen reserveerpagina. Allemaal binnen een halve dag.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="group inline-flex h-12 items-center gap-2 rounded-lg bg-background px-6 font-semibold text-foreground shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                Begin 14-daagse trial
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/contact?topic=demo"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-primary-foreground/35 px-6 font-medium text-primary-foreground transition-colors hover:bg-primary-foreground/10"
              >
                Boek een demo
              </Link>
            </div>
            <p className="mt-5 text-sm text-primary-foreground/70">
              Geen creditcard nodig · Stop wanneer je wil
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
