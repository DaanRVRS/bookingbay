"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, HeartHandshake, Sparkles } from "lucide-react";

export function HelpStrip() {
  return (
    <section className="relative border-t border-border py-16 sm:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/8 via-transparent to-[oklch(0.55_0.13_200)]/8"
      />
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="grid gap-6 rounded-3xl border border-border bg-card p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-10"
        >
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="size-3" />
              Persoonlijke hulp
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Geen technische kennis? Geen probleem.
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty">
              We helpen je gratis met de overstap vanaf je oude systeem of
              Excel-bestand, en plaatsen de boekings-widget kosteloos op je
              eigen website. Eén video­gesprek en je staat erop.
            </p>
            <ul className="mt-5 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <li className="flex items-center gap-2">
                <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                Items overzetten vanuit Excel of je oude systeem
              </li>
              <li className="flex items-center gap-2">
                <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                Widget-installatie op je bestaande site
              </li>
              <li className="flex items-center gap-2">
                <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                Korte training voor jou en je team
              </li>
              <li className="flex items-center gap-2">
                <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                Templates en kleur-styling van je klantsite
              </li>
            </ul>
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <HeartHandshake className="size-7" />
            </span>
            <Link
              href="/contact?topic=anders"
              className="group inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 font-medium text-primary-foreground shadow-sm transition-all hover:shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--primary)_55%,transparent)]"
            >
              Plan een hulpgesprek
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <p className="text-xs text-muted-foreground lg:text-right">
              Gratis · binnen één werkdag contact
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
