"use client";

import { motion } from "motion/react";
import { Calendar, CheckCircle2, Clock3, MoreHorizontal, Users } from "lucide-react";

const bookings = [
  {
    time: "09:00",
    duration: "3u",
    item: "Bavaria 32 — Aurora",
    customer: "Sander de Jong · 4 pers.",
    status: "Onderweg",
    statusColor: "bg-[oklch(0.7_0.13_150)]/15 text-[oklch(0.5_0.14_150)]",
    accent: "from-primary to-[oklch(0.55_0.18_18)]",
  },
  {
    time: "11:30",
    duration: "5u",
    item: "Hanse 41 — Mistral",
    customer: "Lisa & Tom · 6 pers.",
    status: "Bevestigd",
    statusColor: "bg-primary/12 text-primary",
    accent: "from-[oklch(0.55_0.13_200)] to-[oklch(0.45_0.15_220)]",
  },
  {
    time: "14:00",
    duration: "4u",
    item: "RIB 6.5 — Skipper",
    customer: "Familie Kuiper · 5 pers.",
    status: "Borg",
    statusColor: "bg-[oklch(0.85_0.13_85)]/20 text-[oklch(0.45_0.13_70)]",
    accent: "from-[oklch(0.65_0.16_280)] to-[oklch(0.5_0.18_270)]",
  },
];

export function DashboardMockup() {
  return (
    <div className="relative w-full">
      <div className="pointer-events-none absolute -inset-x-6 -top-10 -bottom-12 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/12 via-transparent to-[oklch(0.55_0.13_200)]/14 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_30px_80px_-30px_color-mix(in_oklch,var(--foreground)_25%,transparent)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-2.5 sm:px-5 sm:py-3">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-[oklch(0.7_0.16_30)]" />
              <span className="size-2.5 rounded-full bg-[oklch(0.85_0.13_85)]" />
              <span className="size-2.5 rounded-full bg-[oklch(0.7_0.13_150)]" />
            </div>
            <span className="truncate text-xs text-muted-foreground">app.bookingbay.nl/dashboard</span>
          </div>
          <span className="hidden rounded-md border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground sm:inline">
            ⌘K
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] xl:grid-cols-[160px_1fr]">
          <aside className="hidden flex-col gap-1 border-r border-border bg-muted/20 p-3 text-sm sm:flex">
            {[
              { icon: Calendar, label: "Planning", active: true, count: 12 },
              { icon: CheckCircle2, label: "Boekingen", count: 47 },
              { icon: Clock3, label: "Wachtlijst", count: 3 },
              { icon: Users, label: "Klanten", count: 218 },
            ].map((item) => (
              <div
                key={item.label}
                className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[13px] ${
                  item.active ? "bg-primary/10 text-primary" : "text-muted-foreground"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <item.icon className="size-3.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="rounded-md bg-background px-1.5 py-0.5 text-[10px] font-medium">
                  {item.count}
                </span>
              </div>
            ))}
            <div className="my-2.5 h-px bg-border" />
            <p className="px-2 pb-1 text-[10px] tracking-wide text-muted-foreground uppercase">
              Categorieën
            </p>
            {[
              { label: "Zeilboten", color: "bg-primary" },
              { label: "Sloepen", color: "bg-[oklch(0.55_0.13_200)]" },
              { label: "Tenders", color: "bg-[oklch(0.65_0.16_280)]" },
            ].map((c) => (
              <div key={c.label} className="flex items-center gap-2 px-2 py-1 text-[13px] text-muted-foreground">
                <span className={`size-1.5 rounded-full ${c.color}`} />
                <span className="truncate">{c.label}</span>
              </div>
            ))}
          </aside>

          <div className="flex min-w-0 flex-col gap-3 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Vandaag · maandag 4 mei
                </p>
                <h4 className="mt-0.5 text-base font-semibold tracking-tight sm:text-lg">
                  3 lopende boekingen
                </h4>
              </div>
              <button
                aria-hidden
                className="grid size-7 shrink-0 place-items-center rounded-md border border-border text-muted-foreground"
              >
                <MoreHorizontal className="size-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {bookings.map((b, i) => (
                <motion.div
                  key={b.item}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.5 + i * 0.1,
                    duration: 0.5,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-background/60 p-2.5 pl-3.5"
                >
                  <div className={`absolute top-0 bottom-0 left-0 w-[3px] bg-gradient-to-b ${b.accent}`} />

                  <div className="flex shrink-0 flex-col">
                    <span className="text-[12px] font-semibold leading-tight text-foreground tabular-nums">
                      {b.time}
                    </span>
                    <span className="text-[10px] leading-tight text-muted-foreground">
                      {b.duration}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-foreground">{b.item}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{b.customer}</p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${b.statusColor}`}
                  >
                    {b.status}
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-[11px]">
              <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                <span className="truncate">Volgende vrij vanaf 18:30</span>
              </div>
              <span className="shrink-0 font-medium text-foreground">
                Conflicten: <span className="text-[oklch(0.55_0.16_150)]">0</span>
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating stat card — placed to NOT overlap on smaller widths */}
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="absolute -bottom-7 left-1/2 hidden w-44 -translate-x-1/2 rounded-xl border border-border bg-card p-3.5 shadow-xl sm:left-auto sm:right-4 sm:bottom-auto sm:-top-4 sm:translate-x-0 lg:-right-6 xl:-right-12 xl:block"
      >
        <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Deze week</p>
        <p className="mt-1 text-xl font-semibold tracking-tight">€ 4.832</p>
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
          <span className="rounded-full bg-[oklch(0.7_0.13_150)]/15 px-1.5 py-0.5 font-medium text-[oklch(0.5_0.14_150)]">
            +18%
          </span>
          <span className="text-muted-foreground">vs vorige</span>
        </div>
      </motion.div>
    </div>
  );
}
