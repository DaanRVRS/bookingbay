"use client";

import { motion } from "motion/react";
import { Calendar, CheckCircle2, Clock3, MoreHorizontal, Users } from "lucide-react";

const bookings = [
  {
    time: "09:00 — 12:00",
    item: "Bavaria 32 — Aurora",
    customer: "Sander de Jong",
    party: "4 personen",
    status: "Onderweg",
    statusColor: "bg-[oklch(0.7_0.13_150)]/15 text-[oklch(0.5_0.14_150)]",
    accent: "from-primary to-[oklch(0.55_0.18_18)]",
  },
  {
    time: "11:30 — 16:30",
    item: "Hanse 41 — Mistral",
    customer: "Lisa & Tom",
    party: "6 personen",
    status: "Bevestigd",
    statusColor: "bg-primary/12 text-primary",
    accent: "from-[oklch(0.55_0.13_200)] to-[oklch(0.45_0.15_220)]",
  },
  {
    time: "14:00 — 18:00",
    item: "RIB 6.5 — Skipper",
    customer: "Familie Kuiper",
    party: "5 personen",
    status: "Wacht op borg",
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
        {/* Browser chrome */}
        <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-[oklch(0.7_0.16_30)]" />
              <span className="size-2.5 rounded-full bg-[oklch(0.85_0.13_85)]" />
              <span className="size-2.5 rounded-full bg-[oklch(0.7_0.13_150)]" />
            </div>
            <span className="text-xs text-muted-foreground">app.bookingbay.nl/dashboard</span>
          </div>
          <span className="hidden rounded-md border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground sm:inline">
            ⌘K
          </span>
        </div>

        <div className="grid gap-0 sm:grid-cols-[180px_1fr]">
          {/* Sidebar */}
          <aside className="hidden flex-col gap-1 border-r border-border bg-muted/20 p-4 text-sm sm:flex">
            {[
              { icon: Calendar, label: "Planning", active: true, count: 12 },
              { icon: CheckCircle2, label: "Boekingen", count: 47 },
              { icon: Clock3, label: "Wachtlijst", count: 3 },
              { icon: Users, label: "Klanten", count: 218 },
            ].map((item) => (
              <div
                key={item.label}
                className={`flex items-center justify-between rounded-md px-2.5 py-2 ${
                  item.active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <item.icon className="size-4" />
                  {item.label}
                </span>
                <span className="rounded-md bg-background px-1.5 py-0.5 text-[11px] font-medium">
                  {item.count}
                </span>
              </div>
            ))}
            <div className="my-3 h-px bg-border" />
            <p className="px-2.5 pb-1 text-[11px] tracking-wide text-muted-foreground uppercase">
              Categorieën
            </p>
            {[
              { label: "Zeilboten", color: "bg-primary" },
              { label: "Sloepen", color: "bg-[oklch(0.55_0.13_200)]" },
              { label: "Tenders", color: "bg-[oklch(0.65_0.16_280)]" },
            ].map((c) => (
              <div
                key={c.label}
                className="flex items-center gap-2 px-2.5 py-1.5 text-muted-foreground"
              >
                <span className={`size-1.5 rounded-full ${c.color}`} />
                {c.label}
              </div>
            ))}
          </aside>

          {/* Main panel */}
          <div className="flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Vandaag · maandag 4 mei
                </p>
                <h4 className="mt-1 text-lg font-semibold tracking-tight">3 lopende boekingen</h4>
              </div>
              <button
                aria-hidden
                className="grid size-8 place-items-center rounded-md border border-border text-muted-foreground"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {bookings.map((b, i) => (
                <motion.div
                  key={b.item}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.5 + i * 0.1,
                    duration: 0.5,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-border bg-background/60 p-3 pl-4 transition-shadow hover:shadow-sm"
                >
                  <div
                    className={`absolute top-0 bottom-0 left-0 w-[3px] bg-gradient-to-b ${b.accent}`}
                  />

                  <div className="flex min-w-[6.5rem] flex-col">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {b.time.split(" — ")[0]}
                    </span>
                    <span className="text-[11px] text-muted-foreground/70">
                      → {b.time.split(" — ")[1]}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{b.item}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {b.customer} · {b.party}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${b.statusColor}`}
                  >
                    {b.status}
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-4 py-3 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="size-2 rounded-full bg-primary" />
                <span>Volgende vrij vanaf 18:30</span>
              </div>
              <span className="font-medium text-foreground">
                Conflicten: <span className="text-[oklch(0.55_0.16_150)]">0</span>
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating stat card — moved out of the way */}
      <motion.div
        initial={{ opacity: 0, x: 20, scale: 0.92 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ delay: 1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="absolute -top-4 -right-4 hidden w-44 rounded-xl border border-border bg-card p-3.5 shadow-xl lg:block"
      >
        <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Deze week</p>
        <p className="mt-1 text-xl font-semibold tracking-tight">€ 4.832</p>
        <div className="mt-2 flex items-center gap-1.5 text-[11px]">
          <span className="rounded-full bg-[oklch(0.7_0.13_150)]/15 px-1.5 py-0.5 font-medium text-[oklch(0.5_0.14_150)]">
            +18%
          </span>
          <span className="text-muted-foreground">vs vorige</span>
        </div>
      </motion.div>
    </div>
  );
}
