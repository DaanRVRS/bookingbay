"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { DashboardMockup } from "./DashboardMockup";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="bg-grid bg-radial-fade pointer-events-none absolute inset-0 -z-10 opacity-[0.35]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-to-br from-primary/30 via-primary/10 to-transparent blur-3xl"
      />

      <div className="mx-auto max-w-6xl px-4 pt-14 pb-20 sm:px-6 sm:pt-20 sm:pb-28">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-12">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.6rem]"
            >
              Verhuur.<br />
              <span className="bg-gradient-to-r from-primary via-[oklch(0.62_0.2_22)] to-[oklch(0.55_0.18_350)] bg-clip-text text-transparent">
                Zonder gedoe.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6 }}
              className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty"
            >
              Eén platform voor je <span className="text-foreground">planning</span>, je{" "}
              <span className="text-foreground">klanten</span>, je{" "}
              <span className="text-foreground">facturatie</span> én een eigen boekingssite.
              Gebouwd voor Nederlandse verhuurbedrijven die genoeg hebben van Excel.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.6 }}
              className="mt-9 flex flex-col gap-3 sm:flex-row"
            >
              <Link
                href="/register"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 font-medium text-primary-foreground shadow-[0_8px_28px_-8px_color-mix(in_oklch,var(--primary)_55%,transparent)] transition-all hover:shadow-[0_14px_44px_-12px_color-mix(in_oklch,var(--primary)_60%,transparent)] active:translate-y-px"
              >
                Begin 14-daagse trial
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/#use-cases"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-border bg-card px-6 font-medium text-foreground transition-colors hover:bg-accent"
              >
                Bekijk wat je kunt verhuren
              </Link>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground"
            >
              <span className="flex items-center gap-1.5">
                <Check />
                Geen creditcard
              </span>
              <span className="flex items-center gap-1.5">
                <Check />
                Nederlandstalig
              </span>
              <span className="flex items-center gap-1.5">
                <Check />
                Hosting in EU
              </span>
            </motion.p>
          </div>

          <div className="relative">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
