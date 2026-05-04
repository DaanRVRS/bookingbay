"use client";

import { motion } from "motion/react";
import { Calendar, CheckCircle2, Clock3, MoreHorizontal } from "lucide-react";

const items = [
  { name: "Bavaria 32 — Aurora", color: "from-primary to-[oklch(0.55_0.18_18)]", bookings: [1, 3, 4, 5] },
  { name: "Hanse 41 — Mistral", color: "from-[oklch(0.55_0.13_200)] to-[oklch(0.45_0.15_220)]", bookings: [0, 2, 3] },
  { name: "Beneteau 28 — Solar", color: "from-[oklch(0.7_0.15_160)] to-[oklch(0.55_0.16_180)]", bookings: [1, 2, 5, 6] },
  { name: "RIB 6.5 — Skipper", color: "from-[oklch(0.65_0.16_280)] to-[oklch(0.5_0.18_270)]", bookings: [0, 4, 6] },
];

export function DashboardMockup() {
  return (
    <div className="relative w-full">
      <div className="pointer-events-none absolute -inset-x-6 -top-10 -bottom-10 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/12 via-transparent to-[oklch(0.55_0.13_200)]/14 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_30px_80px_-30px_color-mix(in_oklch,var(--foreground)_25%,transparent)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-[oklch(0.7_0.16_30)]" />
              <span className="size-2.5 rounded-full bg-[oklch(0.85_0.13_85)]" />
              <span className="size-2.5 rounded-full bg-[oklch(0.7_0.13_150)]" />
            </div>
            <span className="ml-3 text-xs text-muted-foreground">app.bookingbay.nl/dashboard/calendar</span>
          </div>
          <span className="hidden text-xs text-muted-foreground sm:inline">Vandaag · week 18</span>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-[200px_1fr]">
          <aside className="flex flex-col gap-1 text-sm">
            {[
              { icon: Calendar, label: "Planning", active: true, count: 12 },
              { icon: CheckCircle2, label: "Boekingen", count: 47 },
              { icon: Clock3, label: "Wachtlijst", count: 3 },
            ].map((item) => (
              <div
                key={item.label}
                className={`flex items-center justify-between rounded-md px-2.5 py-2 ${
                  item.active ? "bg-primary/10 text-primary" : "text-muted-foreground"
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
            <p className="px-2.5 text-[11px] uppercase tracking-wide text-muted-foreground">Categorieën</p>
            {["Zeilboten", "Sloepen", "Tenders"].map((c) => (
              <div key={c} className="flex items-center gap-2 px-2.5 py-1.5 text-muted-foreground">
                <span className="size-1.5 rounded-full bg-primary/60" />
                {c}
              </div>
            ))}
          </aside>

          <div className="rounded-lg border border-border bg-background/50 p-4">
            <div className="flex items-center justify-between pb-3">
              <h4 className="text-sm font-semibold">Week 18 — 28 apr t/m 4 mei</h4>
              <button className="grid size-7 place-items-center rounded-md border border-border text-muted-foreground">
                <MoreHorizontal className="size-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-[7rem_repeat(7,minmax(0,1fr))] gap-1 text-[11px] text-muted-foreground">
              <div />
              {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((d) => (
                <div key={d} className="text-center">
                  {d}
                </div>
              ))}
            </div>

            <div className="mt-2 flex flex-col gap-1.5">
              {items.map((row, rIdx) => (
                <motion.div
                  key={row.name}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + rIdx * 0.08, duration: 0.4 }}
                  className="grid grid-cols-[7rem_repeat(7,minmax(0,1fr))] items-center gap-1"
                >
                  <span className="truncate pr-2 text-xs font-medium">{row.name}</span>
                  {Array.from({ length: 7 }).map((_, dIdx) => {
                    const filled = row.bookings.includes(dIdx);
                    return (
                      <motion.div
                        key={dIdx}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{
                          delay: 0.7 + rIdx * 0.08 + dIdx * 0.04,
                          duration: 0.4,
                          ease: "easeOut",
                        }}
                        style={{ originX: 0 }}
                        className={
                          filled
                            ? `relative h-7 rounded-md bg-gradient-to-r ${row.color}`
                            : "h-7 rounded-md bg-muted/60"
                        }
                      >
                        {filled && (
                          <span className="absolute inset-0 rounded-md ring-1 ring-inset ring-white/10" />
                        )}
                      </motion.div>
                    );
                  })}
                </motion.div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-primary" />
                14 boekingen deze week
              </span>
              <span>Conflicten: <span className="font-medium text-foreground">0</span></span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating stat card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.9, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="absolute -right-3 -bottom-6 hidden w-56 rounded-xl border border-border bg-card p-4 shadow-xl sm:block"
      >
        <p className="text-xs text-muted-foreground">Omzet deze week</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">€ 4.832</p>
        <p className="mt-2 flex items-center gap-1.5 text-xs">
          <span className="rounded-full bg-[oklch(0.7_0.13_150)]/15 px-1.5 py-0.5 font-medium text-[oklch(0.5_0.14_150)]">
            +18%
          </span>
          <span className="text-muted-foreground">vs vorige week</span>
        </p>
      </motion.div>
    </div>
  );
}
