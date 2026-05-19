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
      {/* Merk-gloed: warm oranje, prominenter dan voorheen */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-br from-primary/40 via-primary/15 to-transparent blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 -right-20 -z-10 h-[320px] w-[320px] rounded-full bg-primary/20 blur-3xl"
      />

      <div className="mx-auto max-w-6xl px-4 pt-14 pb-20 sm:px-6 sm:pt-20 sm:pb-28">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-12">
          <div>
            {/* Merk-eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-primary"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              BookingBay · Dé verhuursoftware van Nederland
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.6, ease: "easeOut" }}
              className="mt-5 text-4xl leading-[1.04] font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.7rem]"
            >
              Verhuur.
              <br />
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-[oklch(0.72_0.2_38)] via-primary to-[oklch(0.58_0.2_22)] bg-clip-text text-transparent">
                  Zonder gedoe.
                </span>
                {/* Oranje penseelstreek-onderstreping */}
                <motion.svg
                  aria-hidden
                  viewBox="0 0 300 16"
                  preserveAspectRatio="none"
                  className="absolute -bottom-2 left-0 h-3 w-full"
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ delay: 0.55, duration: 0.6, ease: "easeOut" }}
                  style={{ transformOrigin: "left" }}
                >
                  <path
                    d="M3 11C60 4 130 4 180 7c45 3 80 2 117-3"
                    stroke="var(--primary)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    fill="none"
                  />
                </motion.svg>
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty"
            >
              Eén platform voor je <span className="font-medium text-foreground">planning</span>, je{" "}
              <span className="font-medium text-foreground">klanten</span>, je{" "}
              <span className="font-medium text-foreground">facturatie</span> én een eigen
              boekingssite. Gebouwd voor Nederlandse verhuurbedrijven die genoeg hebben van Excel.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="mt-9 flex flex-col gap-3 sm:flex-row"
            >
              <Link
                href="/register"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 font-semibold text-primary-foreground shadow-[0_8px_28px_-8px_color-mix(in_oklch,var(--primary)_55%,transparent)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_48px_-12px_color-mix(in_oklch,var(--primary)_65%,transparent)] active:translate-y-0"
              >
                Begin 14-daagse trial
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/#use-cases"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-border bg-card px-6 font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent"
              >
                Bekijk wat je kunt verhuren
              </Link>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.5 }}
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
            {/* Subtiele oranje rand-gloed achter de mockup */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-tr from-primary/15 via-transparent to-primary/10 blur-2xl"
            />
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

function Check() {
  return (
    <span className="grid size-4 place-items-center rounded-full bg-primary/15">
      <svg
        viewBox="0 0 24 24"
        className="size-3 text-primary"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  );
}
