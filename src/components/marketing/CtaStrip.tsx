"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

export function CtaStrip() {
  return (
    <section className="relative overflow-hidden border-t border-border py-20 sm:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/15 via-transparent to-[oklch(0.55_0.13_200)]/12"
      />
      <div
        aria-hidden
        className="bg-grid bg-radial-fade pointer-events-none absolute inset-0 -z-10 opacity-30"
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-3xl px-4 text-center sm:px-6"
      >
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Klaar om je verhuur op orde te brengen?
        </h2>
        <p className="mt-4 text-lg text-muted-foreground text-pretty">
          Begin gratis. Importeer je items. Geef klanten een eigen reserveerpagina. Allemaal binnen
          een halve dag.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="group inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 font-medium text-primary-foreground shadow-[0_8px_28px_-8px_color-mix(in_oklch,var(--primary)_55%,transparent)] transition-all hover:shadow-[0_14px_44px_-12px_color-mix(in_oklch,var(--primary)_60%,transparent)] active:translate-y-px"
          >
            Begin 14-daagse trial
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/contact?topic=demo"
            className="inline-flex h-12 items-center justify-center rounded-lg border border-border bg-card px-6 font-medium text-foreground transition-colors hover:bg-accent"
          >
            Boek een demo
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Geen creditcard nodig · Stop wanneer je wil</p>
      </motion.div>
    </section>
  );
}
