"use client";

import { motion } from "motion/react";
import {
  ArrowRight,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Globe,
  Layers,
  Lock,
  MousePointerClick,
  Plus,
  ShieldCheck,
  Ship,
  Users,
  Zap,
} from "lucide-react";

// Exact dezelfde item-accent-gradients als het echte Planning-scherm
// (src/app/dashboard/calendar/calendar-view.tsx).
const itemAccents = [
  "from-primary to-[oklch(0.55_0.18_18)]",
  "from-[oklch(0.55_0.13_200)] to-[oklch(0.45_0.15_220)]",
  "from-[oklch(0.7_0.15_160)] to-[oklch(0.55_0.16_180)]",
  "from-[oklch(0.65_0.16_280)] to-[oklch(0.5_0.18_270)]",
  "from-[oklch(0.7_0.14_60)] to-[oklch(0.55_0.16_50)]",
  "from-[oklch(0.6_0.14_340)] to-[oklch(0.5_0.17_320)]",
];

// Accent waarmee een verhuurder z'n eigen widget brandt — net als de
// tenant-accent in de echte boek-widget (een eigen kleur, niet die van ons).
const WIDGET_ACCENT = "oklch(0.55 0.16 255)";

export function Features() {
  return (
    <section
      id="features"
      className="relative border-t border-border py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Functies</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Alles erin. Niets te veel.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            We hebben de helft van de features eruit gelaten waar je nooit op
            zou klikken.
          </p>
        </div>

        {/* Showcase 1 — de echte week-planning */}
        <ShowcaseRow
          icon={CalendarRange}
          eyebrow="Eén planning"
          title="Slimme planning"
          body="Eén overzicht voor je hele aanbod: per item zie je in één oogopslag wat geboekt is. Sleep een boeking naar een ander tijdslot, conflict-detectie voorkomt dubbelboekingen automatisch."
          mock={<PlanningMock />}
          frameUrl="app.bookingbay.nl/planning"
          mediaFirst={false}
          delay={0}
        />

        {/* Showcase 2 — de echte boek-widget op je eigen site */}
        <ShowcaseRow
          icon={MousePointerClick}
          eyebrow="Op je eigen site"
          title="Boek-widget op je site"
          body="Plak één regel code op je eigen website. Klanten kiezen datum en tijd, zien meteen wat vrij is en boeken direct — met iDEAL. Jouw merk, jouw kleuren, geen platform ertussen."
          mock={<WidgetMock />}
          frameUrl="verhuurdehoeve.nl/boeken"
          mediaFirst
          delay={0.05}
        />

        {/* Compacte feature-strip — scant in 3 seconden */}
        <div className="mt-16 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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

/* ------------------------------------------------------------------ */
/* Showcase-rij: tekst naast een app-scherm in browser-frame           */
/* ------------------------------------------------------------------ */

function ShowcaseRow({
  icon: Icon,
  eyebrow,
  title,
  body,
  mock,
  frameUrl,
  mediaFirst,
  delay = 0,
}: {
  icon: typeof CalendarRange;
  eyebrow: string;
  title: string;
  body: string;
  mock: React.ReactNode;
  frameUrl: string;
  mediaFirst: boolean;
  delay?: number;
}) {
  return (
    <div className="mt-16 grid items-center gap-8 lg:mt-24 lg:grid-cols-5 lg:gap-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ delay, duration: 0.5, ease: "easeOut" }}
        className={`lg:col-span-2 ${mediaFirst ? "lg:order-2" : ""}`}
      >
        <span className="inline-grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <p className="mt-4 text-sm font-medium text-primary">{eyebrow}</p>
        <h3 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h3>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          {body}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ delay: delay + 0.08, duration: 0.6, ease: "easeOut" }}
        className={`lg:col-span-3 ${mediaFirst ? "lg:order-1" : ""}`}
      >
        <BrowserFrame url={frameUrl}>{mock}</BrowserFrame>
      </motion.div>
    </div>
  );
}

function BrowserFrame({
  url,
  children,
}: {
  url: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-black/[0.07] ring-1 ring-black/[0.02]">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2.5">
        <span className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </span>
        <span className="mx-auto flex max-w-full items-center gap-1.5 truncate rounded-md bg-background px-3 py-1 text-[11px] text-muted-foreground">
          <Lock className="size-3 shrink-0" />
          <span className="truncate">{url}</span>
        </span>
        <span className="w-[52px]" />
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Planning-mock — nagebouwd uit WeekTimeGrid                          */
/* ------------------------------------------------------------------ */

const START_HOUR = 8;
const PLAN_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16];
const HOUR_H = 44;
const GRID_H = (PLAN_HOURS.length - 1) * HOUR_H;

function PlanningMock() {
  const days = [
    { name: "ma", num: "9" },
    { name: "di", num: "10" },
    { name: "wo", num: "11" },
    { name: "do", num: "12", today: true },
    { name: "vr", num: "13" },
    { name: "za", num: "14" },
    { name: "zo", num: "15" },
  ];
  // s/e = start/eind in decimale uren; accent = item-gradient
  const bookings = [
    { col: 0, s: 9, e: 11, accent: itemAccents[0], item: "Sloep Aurora", cust: "Jansen" },
    { col: 0, s: 13, e: 15.5, accent: itemAccents[2], item: "Sup Pro", cust: "Kok" },
    { col: 1, s: 10.5, e: 13, accent: itemAccents[1], item: "Bakfiets", cust: "De Vries" },
    { col: 2, s: 9.5, e: 11.5, accent: itemAccents[3], item: "Kano duo", cust: "Bakker" },
    { col: 3, s: 11, e: 14, accent: itemAccents[0], item: "Sloep Aurora", cust: "Visser" },
    { col: 4, s: 9, e: 10.5, accent: itemAccents[4], item: "E-bike", cust: "Smit" },
    { col: 4, s: 12.5, e: 15, accent: itemAccents[2], item: "Sup Pro", cust: "Mulder" },
    { col: 5, s: 10, e: 13.5, accent: itemAccents[1], item: "Bakfiets", cust: "Peters" },
    { col: 6, s: 13, e: 15.5, accent: itemAccents[0], item: "Sloep Aurora", cust: "Dekker" },
  ];

  return (
    <div className="bg-background p-3 sm:p-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-end justify-between gap-3 pb-3">
        <div>
          <p className="text-[11px] text-muted-foreground">Planning</p>
          <h4 className="text-base font-semibold tracking-tight sm:text-lg">
            9 — 15 jun 2025
          </h4>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="inline-flex rounded-md border border-border bg-card p-0.5 text-[11px]">
            <span className="rounded bg-primary/10 px-2 py-1 font-medium text-primary">
              Week
            </span>
            <span className="px-2 py-1 text-muted-foreground">Dag</span>
            <span className="px-2 py-1 text-muted-foreground">Items</span>
          </div>
          <span className="grid size-7 place-items-center rounded-md border border-border text-muted-foreground">
            <ChevronLeft className="size-3.5" />
          </span>
          <span className="hidden rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground sm:inline">
            Vandaag
          </span>
          <span className="grid size-7 place-items-center rounded-md border border-border text-muted-foreground">
            <ChevronRight className="size-3.5" />
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-medium text-primary-foreground">
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">Boeking</span>
          </span>
        </div>
      </div>

      {/* Week-rooster */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Dag-header */}
        <div className="grid grid-cols-[44px_repeat(7,minmax(0,1fr))] border-b border-border bg-muted/30">
          <div />
          {days.map((d, i) => (
            <div
              key={i}
              className={`border-l border-border px-1 py-1.5 text-center ${
                d.today ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <span className="block text-[9px] font-medium uppercase tracking-wide">
                {d.name}
              </span>
              <span className="block text-xs font-semibold tabular-nums">
                {d.num}
              </span>
            </div>
          ))}
        </div>

        {/* Tijd-grid */}
        <div
          className="relative grid grid-cols-[44px_repeat(7,minmax(0,1fr))]"
          style={{ height: GRID_H }}
        >
          {/* Uur-labels */}
          <div className="relative border-r border-border">
            {PLAN_HOURS.map((h, i) => (
              <span
                key={h}
                className="absolute right-1.5 -translate-y-1/2 text-[9px] font-medium tabular-nums text-muted-foreground"
                style={{ top: i * HOUR_H }}
              >
                {String(h).padStart(2, "0")}:00
              </span>
            ))}
          </div>

          {/* Dag-kolommen */}
          {days.map((d, col) => (
            <div
              key={col}
              className={`relative border-l border-border ${
                d.today ? "bg-primary/[0.025]" : ""
              }`}
            >
              {PLAN_HOURS.map((h, i) => (
                <div
                  key={h}
                  className="absolute inset-x-0 border-t border-border/60"
                  style={{ top: i * HOUR_H }}
                />
              ))}
              {bookings
                .filter((b) => b.col === col)
                .map((b, i) => (
                  <div
                    key={i}
                    className={`absolute inset-x-1 flex flex-col gap-0.5 overflow-hidden rounded-md bg-gradient-to-br ${b.accent} px-1.5 py-1 text-white shadow-sm`}
                    style={{
                      top: (b.s - START_HOUR) * HOUR_H + 1,
                      height: (b.e - b.s) * HOUR_H - 2,
                    }}
                  >
                    <span className="truncate text-[10px] font-semibold leading-tight">
                      {hhmm(b.s)} {b.item}
                    </span>
                    <span className="truncate text-[10px] leading-tight opacity-90">
                      {b.cust}
                    </span>
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function hhmm(decimal: number): string {
  const h = Math.floor(decimal);
  const m = Math.round((decimal - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/* Widget-mock — nagebouwd uit PublicBookingForm                       */
/* ------------------------------------------------------------------ */

function WidgetMock() {
  const accent = WIDGET_ACCENT;
  const weekdays = ["ma", "di", "wo", "do", "vr", "za", "zo"];
  // september 2025 — de 1e valt op maandag, dus een schone maand-grid.
  const fullDays = new Set([13, 18, 21, 27]);
  const pastUntil = 10;
  const selected = 12;
  const calCells: ({ n: number; state: "past" | "avail" | "full" | "sel" } | null)[] =
    [];
  for (let n = 1; n <= 30; n++) {
    let state: "past" | "avail" | "full" | "sel" = "avail";
    if (n <= pastUntil) state = "past";
    else if (n === selected) state = "sel";
    else if (fullDays.has(n)) state = "full";
    calCells.push({ n, state });
  }
  while (calCells.length % 7 !== 0) calCells.push(null);

  const slots = [
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
  ];
  const startSlot = "11:00";
  const endSlot = "14:00";
  const fullSlot = "16:00";
  const slotState = (s: string): "start" | "end" | "mid" | "full" | "free" => {
    if (s === startSlot) return "start";
    if (s === endSlot) return "end";
    if (s === fullSlot) return "full";
    if (s > startSlot && s < endSlot) return "mid";
    return "free";
  };

  return (
    <div
      className="bg-background p-4 sm:p-5"
      style={{ ["--rdp-accent-color" as string]: accent }}
    >
      <div className="mx-auto max-w-md">
        {/* Merk-header */}
        <div className="flex items-center gap-2.5">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-lg text-white shadow-sm"
            style={{ background: accent }}
          >
            <Ship className="size-4" />
          </span>
          <div className="min-w-0">
            <p
              className="text-[9px] font-semibold uppercase tracking-wider"
              style={{ color: accent }}
            >
              Boek bij
            </p>
            <p className="truncate text-sm font-bold leading-tight">
              Verhuur de Hoeve
            </p>
          </div>
          <span className="ml-auto rounded border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground">
            NL
          </span>
        </div>

        {/* Stappen */}
        <div className="mt-4 flex items-center gap-1.5 text-[10px] font-medium">
          {["Wanneer", "Gegevens", "Bevestiging"].map((step, i) => (
            <div key={step} className="flex flex-1 items-center gap-1.5">
              <span
                className="grid size-4 shrink-0 place-items-center rounded-full text-[8px] font-bold"
                style={
                  i === 0
                    ? { background: accent, color: "#fff" }
                    : {
                        background: "var(--muted)",
                        color: "var(--muted-foreground)",
                      }
                }
              >
                {i + 1}
              </span>
              <span
                className={i === 0 ? "" : "text-muted-foreground"}
                style={i === 0 ? { color: accent } : undefined}
              >
                {step}
              </span>
              {i < 2 && <span className="h-px flex-1 bg-border" />}
            </div>
          ))}
        </div>

        {/* Sectie-label */}
        <div className="mt-4 mb-2.5 flex items-center gap-2">
          <span
            className="grid size-6 place-items-center rounded-md"
            style={{ background: `${accent}22`, color: accent }}
          >
            <CalendarDays className="size-3.5" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Wanneer
          </span>
        </div>

        {/* Gekozen dag */}
        <div className="mb-3 rounded-lg border border-border bg-muted/30 p-2">
          <div
            className="rounded-md bg-background px-3 py-2"
            style={{
              border: `1px solid ${accent}55`,
              boxShadow: `inset 0 0 0 1px ${accent}15`,
            }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Wanneer
            </p>
            <p className="text-sm font-semibold tracking-tight">
              12 sep
              <span className="ml-1.5 text-xs font-normal tabular-nums text-muted-foreground">
                · 11:00 — 14:00
              </span>
            </p>
          </div>
        </div>

        {/* Kalender */}
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="mb-2 text-center text-xs font-semibold capitalize">
            september 2025
          </p>
          <div className="grid grid-cols-7">
            {weekdays.map((d) => (
              <span
                key={d}
                className="pb-1 text-center text-[10px] font-medium text-muted-foreground"
              >
                {d}
              </span>
            ))}
            {calCells.map((cell, i) => {
              if (!cell) return <span key={i} />;
              const base =
                "m-0.5 grid h-8 place-items-center rounded-md text-xs font-medium tabular-nums";
              if (cell.state === "sel") {
                return (
                  <span
                    key={i}
                    className={base + " text-white shadow-sm"}
                    style={{ background: accent }}
                  >
                    {cell.n}
                  </span>
                );
              }
              if (cell.state === "past") {
                return (
                  <span key={i} className={base + " text-muted-foreground/40"}>
                    {cell.n}
                  </span>
                );
              }
              if (cell.state === "full") {
                return (
                  <span
                    key={i}
                    className={
                      base +
                      " bg-[oklch(0.72_0.16_25)]/15 text-[oklch(0.55_0.16_25)]"
                    }
                  >
                    {cell.n}
                  </span>
                );
              }
              return (
                <span
                  key={i}
                  className={
                    base +
                    " bg-[oklch(0.78_0.13_145)]/15 text-[oklch(0.42_0.13_150)]"
                  }
                >
                  {cell.n}
                </span>
              );
            })}
          </div>
          {/* Legenda */}
          <div className="mt-2 flex items-center justify-center gap-4 border-t border-border pt-2 text-[10px] font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-[oklch(0.78_0.13_145)]" />
              Beschikbaar
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-[oklch(0.72_0.16_25)]" />
              Vol
            </span>
          </div>
        </div>

        {/* Tijdvak */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Tijdvak
            </span>
            <span
              className="text-[10px] font-semibold tabular-nums"
              style={{ color: accent }}
            >
              11:00 — 14:00
            </span>
          </div>
          <div className="mt-1.5 grid grid-cols-5 gap-1.5">
            {slots.map((s) => {
              const st = slotState(s);
              if (st === "start" || st === "end") {
                return (
                  <span
                    key={s}
                    className="grid h-8 place-items-center rounded-md text-[11px] font-semibold tabular-nums text-white shadow-sm"
                    style={{ background: accent }}
                  >
                    {s}
                  </span>
                );
              }
              if (st === "mid") {
                return (
                  <span
                    key={s}
                    className="grid h-8 place-items-center rounded-md border text-[11px] font-semibold tabular-nums"
                    style={{
                      background: `color-mix(in oklch, ${accent} 14%, transparent)`,
                      borderColor: `color-mix(in oklch, ${accent} 30%, transparent)`,
                      color: accent,
                    }}
                  >
                    {s}
                  </span>
                );
              }
              if (st === "full") {
                return (
                  <span
                    key={s}
                    className="grid h-8 place-items-center rounded-md border border-dashed border-border/60 bg-muted/20 text-[11px] font-semibold tabular-nums text-muted-foreground/40 line-through"
                  >
                    {s}
                  </span>
                );
              }
              return (
                <span
                  key={s}
                  className="grid h-8 place-items-center rounded-md border border-border bg-background text-[11px] font-semibold tabular-nums text-foreground"
                >
                  {s}
                </span>
              );
            })}
          </div>
        </div>

        {/* Prijs */}
        <div
          className="mt-3 flex items-center justify-between gap-3 rounded-lg px-3.5 py-2.5"
          style={{ background: `${accent}0D`, border: `1px solid ${accent}33` }}
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Geschatte prijs
            </p>
            <p
              className="text-lg font-semibold leading-tight tabular-nums"
              style={{ color: accent }}
            >
              € 90,00
            </p>
          </div>
          <p className="max-w-[55%] text-[10px] leading-snug text-muted-foreground">
            Definitieve prijs bevestigd door Verhuur de Hoeve.
          </p>
        </div>

        {/* CTA */}
        <div
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-sm"
          style={{ background: accent, boxShadow: `0 4px 14px -4px ${accent}80` }}
        >
          Volgende
          <ArrowRight className="size-4" />
        </div>
      </div>
    </div>
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
