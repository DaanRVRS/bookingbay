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

// Week-tijdrooster, precies zoals de Planning-weergave in het dashboard:
// uren verticaal, 7 dag-kolommen, boekingen als gekleurde gradient-blokken
// op hun exacte tijdpositie.
function PlanningVisual() {
  const days = ["ma", "di", "wo", "do", "vr", "za", "zo"];
  const dayNums = ["12", "13", "14", "15", "16", "17", "18"];
  const hours = ["09", "12", "15", "18"];
  // col = dag-index, top/height in % van de tijd-kolom, color = item-accent
  const blocks = [
    { col: 0, top: 6, h: 20, color: "from-primary to-[oklch(0.55_0.18_18)]", time: "09:00", label: "Aurora" },
    { col: 1, top: 34, h: 26, color: "from-[oklch(0.55_0.13_200)] to-[oklch(0.45_0.15_220)]", time: "13:30", label: "Bakfiets" },
    { col: 2, top: 14, h: 16, color: "from-[oklch(0.7_0.15_160)] to-[oklch(0.55_0.16_180)]", time: "10:30", label: "Sup Pro" },
    { col: 3, top: 48, h: 30, color: "from-[oklch(0.65_0.16_280)] to-[oklch(0.5_0.18_270)]", time: "15:00", label: "Kano" },
    { col: 4, top: 20, h: 34, color: "from-primary to-[oklch(0.55_0.18_18)]", time: "11:00", label: "Aurora" },
    { col: 6, top: 40, h: 22, color: "from-[oklch(0.7_0.15_160)] to-[oklch(0.55_0.16_180)]", time: "14:00", label: "Sup Pro" },
  ];
  return (
    <div className="relative h-48 overflow-hidden rounded-lg border border-border bg-card">
      {/* Dag-header */}
      <div className="grid grid-cols-[26px_repeat(7,1fr)] border-b border-border bg-muted/30">
        <div />
        {days.map((d, i) => (
          <div key={i} className="border-l border-border py-1 text-center">
            <span className="block text-[7px] font-medium uppercase leading-none text-muted-foreground">
              {d}
            </span>
            <span className="mt-0.5 block text-[9px] font-semibold leading-none tabular-nums">
              {dayNums[i]}
            </span>
          </div>
        ))}
      </div>
      {/* Tijd-rooster */}
      <div className="relative grid h-[156px] grid-cols-[26px_repeat(7,1fr)]">
        <div className="relative border-r border-border">
          {hours.map((h, i) => (
            <span
              key={h}
              className="absolute right-1 text-[7px] tabular-nums text-muted-foreground"
              style={{ top: `${i * 28}%` }}
            >
              {h}
            </span>
          ))}
        </div>
        {days.map((_, col) => (
          <div key={col} className="relative border-l border-border">
            {hours.map((_, i) => (
              <div
                key={i}
                className="absolute inset-x-0 border-t border-border/45"
                style={{ top: `${i * 28}%` }}
              />
            ))}
            {blocks
              .filter((b) => b.col === col)
              .map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + col * 0.04, duration: 0.3 }}
                  className={`absolute inset-x-[2px] overflow-hidden rounded bg-gradient-to-br ${b.color} px-1 py-0.5 shadow-sm`}
                  style={{ top: `${b.top}%`, height: `${b.h}%` }}
                >
                  <span className="block truncate text-[6px] font-semibold leading-tight text-white">
                    {b.time}
                  </span>
                  <span className="block truncate text-[6px] leading-tight text-white/85">
                    {b.label}
                  </span>
                </motion.div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Echte boek-widget zoals klanten 'm op je eigen site zien: merk-header,
// kalender met beschikbaar/vol, en tijdsloten.
function WidgetVisual() {
  // 0 = leeg (vorige maand), 1 = beschikbaar, 2 = vol
  const calendar = [0, 0, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1];
  const selected = 9;
  const slots = [
    { t: "10:00", busy: false },
    { t: "11:00", busy: true },
    { t: "13:00", busy: false },
    { t: "14:00", busy: false },
  ];
  return (
    <div className="relative h-48 overflow-hidden rounded-lg border border-border bg-card p-3">
      {/* Merk-header */}
      <div className="flex items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary text-[9px] font-bold text-primary-foreground">
          VH
        </span>
        <div className="min-w-0">
          <p className="text-[7px] font-semibold uppercase leading-none tracking-wider text-primary">
            Boek bij
          </p>
          <p className="mt-0.5 truncate text-[11px] font-bold leading-tight">
            Verhuur de Hoeve
          </p>
        </div>
        <span className="ml-auto rounded border border-border px-1.5 py-0.5 text-[7px] text-muted-foreground">
          NL
        </span>
      </div>
      {/* Mini-kalender */}
      <div className="mt-2.5 grid grid-cols-7 gap-0.5">
        {["m", "d", "w", "d", "v", "z", "z"].map((d, i) => (
          <span key={i} className="text-center text-[6px] font-medium text-muted-foreground">
            {d}
          </span>
        ))}
        {calendar.map((state, i) => (
          <div
            key={i}
            className={`grid h-3.5 place-items-center rounded text-[6px] font-medium tabular-nums ${
              state === 0
                ? "text-transparent"
                : i === selected
                  ? "bg-primary text-primary-foreground"
                  : state === 2
                    ? "bg-[oklch(0.72_0.16_25)]/15 text-[oklch(0.55_0.16_25)]"
                    : "bg-[oklch(0.78_0.13_145)]/20 text-[oklch(0.42_0.13_150)]"
            }`}
          >
            {state === 0 ? "0" : i - 1}
          </div>
        ))}
      </div>
      {/* Tijdsloten */}
      <div className="mt-2 grid grid-cols-4 gap-1">
        {slots.map((s) => (
          <div
            key={s.t}
            className={`rounded border py-0.5 text-center text-[7px] font-semibold tabular-nums ${
              s.busy
                ? "border-dashed border-border/60 text-muted-foreground/40 line-through"
                : "border-primary/30 bg-primary/5 text-primary"
            }`}
          >
            {s.t}
          </div>
        ))}
      </div>
    </div>
  );
}
