"use client";

import { motion } from "motion/react";
import {
  CalendarRange,
  Globe,
  MousePointerClick,
  ShieldCheck,
  Ship,
  Users,
  Zap,
  Layers,
} from "lucide-react";

export function Features() {
  return (
    <section id="features" className="relative border-t border-border py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Functies</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Alles erin. Niets te veel.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            We hebben de helft van de features eruit gelaten waar je nooit op zou klikken.
          </p>
        </div>

        {/* Twee verhalende kaarten met visual */}
        <div className="mt-14 grid gap-4 sm:grid-cols-2">
          <FeatureCard
            icon={CalendarRange}
            title="Slimme planning"
            body="Eén planning voor je hele aanbod: per item zie je in één oogopslag wat geboekt is. Conflict-detectie voorkomt dubbelboekingen automatisch."
            visual={<PlanningVisual />}
            delay={0}
          />
          <FeatureCard
            icon={MousePointerClick}
            title="Boek-widget op je site"
            body="Plak één regel code op je eigen site. Klanten kiezen datum en tijd, zien wat vrij is en boeken direct — met iDeal. Geen platform ertussen."
            visual={<WidgetVisual />}
            delay={0.05}
          />
        </div>

        {/* Compacte feature-strip — scant in 3 seconden */}
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Pill icon={Layers} label="Geneste categorieën" delay={0.1} />
          <Pill icon={Users} label="4 rollen fijn-grain" delay={0.15} />
          <Pill icon={Zap} label="Mobile-first" delay={0.2} />
          <Pill icon={ShieldCheck} label="EU-hosted · AVG" delay={0.25} />
          <Pill icon={Globe} label="Custom domein" delay={0.3} />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
  visual,
  delay = 0,
}: {
  icon: typeof CalendarRange;
  title: string;
  body: string;
  visual?: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:bg-card/80"
    >
      {visual && <div className="mb-6">{visual}</div>}
      <span className="inline-grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </motion.div>
  );
}

function Pill({
  icon: Icon,
  label,
  delay = 0,
}: {
  icon: typeof Layers;
  label: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay, duration: 0.35, ease: "easeOut" }}
      className="flex items-center gap-2.5 rounded-xl border border-border bg-card/50 px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-card"
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-3.5" />
      </span>
      <span className="truncate text-xs font-medium leading-tight">{label}</span>
    </motion.div>
  );
}

// Echte planning: item-rijen × dagen met boekingen als gekleurde blokken,
// precies zoals het Planning-scherm in het dashboard eruitziet.
function PlanningVisual() {
  const days = ["M", "D", "W", "D", "V", "Z", "Z"];
  const rows = [
    {
      label: "Sloep Aurora",
      color: "from-primary to-[oklch(0.55_0.18_18)]",
      cells: [true, true, false, false, true, false, false],
    },
    {
      label: "Bakfiets",
      color: "from-[oklch(0.55_0.13_200)] to-[oklch(0.45_0.15_220)]",
      cells: [false, true, false, false, false, false, false],
    },
    {
      label: "Sup Pro",
      color: "from-[oklch(0.7_0.15_160)] to-[oklch(0.55_0.16_180)]",
      cells: [false, false, false, false, false, true, true],
    },
  ];
  return (
    <div className="relative h-32 overflow-hidden rounded-lg border border-border bg-background/60 p-2.5">
      <div className="grid grid-cols-[44px_repeat(7,1fr)] gap-1">
        <span />
        {days.map((d, i) => (
          <span
            key={i}
            className="text-center text-[8px] font-medium uppercase text-muted-foreground"
          >
            {d}
          </span>
        ))}
      </div>
      <div className="mt-2 space-y-1.5">
        {rows.map((r, row) => (
          <div
            key={r.label}
            className="grid grid-cols-[44px_repeat(7,1fr)] items-center gap-1"
          >
            <span className="truncate text-[9px] font-medium text-muted-foreground">
              {r.label}
            </span>
            {r.cells.map((filled, col) => (
              <motion.div
                key={col}
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: (row * 7 + col) * 0.012, duration: 0.3 }}
                className={
                  filled
                    ? `h-4 rounded bg-gradient-to-r ${r.color}`
                    : "h-4 rounded bg-muted"
                }
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Boek-widget zoals klanten 'm op je eigen site zien: item + vrije/bezette
// tijdsloten + boeken-knop.
function WidgetVisual() {
  const slots = [
    { t: "09:00", busy: true },
    { t: "10:00", busy: false },
    { t: "11:00", busy: false },
    { t: "12:00", busy: true },
    { t: "13:00", busy: false },
    { t: "14:00", busy: false },
  ];
  return (
    <div className="relative h-32 overflow-hidden rounded-lg border border-border bg-background/60 p-3">
      <div className="flex items-center gap-2">
        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
          <Ship className="size-3.5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold leading-tight">
            Sloep Aurora
          </p>
          <p className="text-[9px] text-muted-foreground">Kies een tijdslot</p>
        </div>
        <span className="ml-auto text-[11px] font-semibold tabular-nums text-primary">
          €75
        </span>
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-1">
        {slots.map((s, i) => (
          <motion.div
            key={s.t}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className={`rounded border py-1 text-center text-[9px] font-semibold tabular-nums ${
              s.busy
                ? "border-dashed border-border/60 text-muted-foreground/40 line-through"
                : "border-primary/30 bg-primary/5 text-primary"
            }`}
          >
            {s.t}
          </motion.div>
        ))}
      </div>
      <div className="mt-2.5 rounded-md bg-primary py-1.5 text-center text-[10px] font-medium text-primary-foreground">
        Boeken →
      </div>
    </div>
  );
}
