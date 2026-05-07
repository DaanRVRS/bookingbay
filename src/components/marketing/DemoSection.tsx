"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Globe,
  LayoutDashboard,
  Package,
  Plus,
  Ship,
  Users,
} from "lucide-react";
import { addDays, differenceInCalendarDays, format } from "date-fns";
import { nl } from "date-fns/locale";

const PRICE_PER_DAY = 75;
const PRICE_PER_WEEK = 380;
const DEPOSIT = 200;

export function DemoSection() {
  const [tab, setTab] = useState<"customer" | "dashboard">("customer");

  return (
    <section
      id="demo"
      className="relative border-t border-border bg-muted/20 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Live demo</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Probeer het zonder account
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Bekijk hoe BookingBay werkt — zowel voor jouw klanten als voor jou
            achter de schermen.
          </p>
        </div>

        <div className="mt-10 flex justify-center">
          <div className="inline-flex rounded-full border border-border bg-card p-1 text-sm shadow-sm">
            <TabButton
              active={tab === "customer"}
              onClick={() => setTab("customer")}
              icon={Globe}
              label="Klantsite"
            />
            <TabButton
              active={tab === "dashboard"}
              onClick={() => setTab("dashboard")}
              icon={LayoutDashboard}
              label="Dashboard"
            />
          </div>
        </div>

        <div className="mt-10">
          <AnimatePresence mode="wait">
            {tab === "customer" ? (
              <motion.div
                key="customer"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
              >
                <CustomerDemo />
              </motion.div>
            ) : (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
              >
                <DashboardDemo />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Globe;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

function BrowserChrome({
  url,
  children,
}: {
  url: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-[oklch(0.7_0.18_25)]/60" />
        <span className="size-2.5 rounded-full bg-[oklch(0.8_0.13_85)]/60" />
        <span className="size-2.5 rounded-full bg-[oklch(0.7_0.13_150)]/60" />
        <div className="ml-3 flex h-6 flex-1 items-center justify-center rounded-md bg-background/60 px-3 text-xs text-muted-foreground">
          {url}
        </div>
      </div>
      {children}
    </div>
  );
}

/* ---------------------- CUSTOMER DEMO ---------------------- */

function CustomerDemo() {
  const today = useMemo(() => new Date(), []);
  const [start, setStart] = useState<Date>(addDays(today, 3));
  const [end, setEnd] = useState<Date>(addDays(today, 5));
  const [done, setDone] = useState(false);

  const days = Math.max(1, differenceInCalendarDays(end, start) + 1);
  const useWeek = days >= 7;
  const subtotal = useWeek
    ? Math.ceil(days / 7) * PRICE_PER_WEEK
    : days * PRICE_PER_DAY;
  const total = subtotal + DEPOSIT;

  const adjustStart = (delta: number) => {
    const next = addDays(start, delta);
    if (next < today) return;
    setStart(next);
    if (next > end) setEnd(addDays(next, 1));
  };
  const adjustEnd = (delta: number) => {
    const next = addDays(end, delta);
    if (next <= start) return;
    setEnd(next);
  };

  return (
    <BrowserChrome url="https://aquasloep.bookingbay.nl">
      <div className="grid gap-0 lg:grid-cols-[1.2fr_1fr]">
        {/* Item display */}
        <div className="border-b border-border p-6 sm:p-8 lg:border-r lg:border-b-0">
          <div className="relative h-44 overflow-hidden rounded-xl bg-gradient-to-br from-[oklch(0.55_0.13_220)] via-[oklch(0.45_0.15_240)] to-[oklch(0.3_0.15_260)]">
            <div className="absolute inset-0 grid place-items-center text-white/80">
              <Ship className="size-16" />
            </div>
            <div className="absolute right-3 top-3 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur">
              Beschikbaar
            </div>
          </div>
          <h3 className="mt-5 text-xl font-semibold tracking-tight">
            Sloep Aurora — 6 personen
          </h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Elektrische sloep, comfortabel voor een halve of hele dag varen door
            de grachten. Vaarbewijs niet vereist.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <PriceTile label="Per dag" value={`€${PRICE_PER_DAY}`} />
            <PriceTile label="Per week" value={`€${PRICE_PER_WEEK}`} />
            <PriceTile label="Borg" value={`€${DEPOSIT}`} />
          </div>
        </div>

        {/* Booking form */}
        <div className="bg-muted/20 p-6 sm:p-8">
          {done ? (
            <SuccessState
              start={start}
              end={end}
              total={total}
              onReset={() => setDone(false)}
            />
          ) : (
            <>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Reserveer
              </p>
              <h3 className="mt-1 text-lg font-semibold">
                Kies je vaardagen
              </h3>

              <div className="mt-5 flex flex-col gap-3">
                <DatePickerRow
                  label="Vanaf"
                  date={start}
                  onMinus={() => adjustStart(-1)}
                  onPlus={() => adjustStart(1)}
                />
                <DatePickerRow
                  label="Tot en met"
                  date={end}
                  onMinus={() => adjustEnd(-1)}
                  onPlus={() => adjustEnd(1)}
                />
              </div>

              <div className="mt-6 rounded-xl border border-border bg-background p-4 text-sm">
                <Row
                  label={`${days} ${days === 1 ? "dag" : "dagen"} ${useWeek ? "(week­tarief)" : ""}`}
                  value={`€${subtotal}`}
                />
                <Row label="Borg (retour bij inlevering)" value={`€${DEPOSIT}`} />
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-base font-semibold">
                  <span>Totaal</span>
                  <span className="tabular-nums">€{total}</span>
                </div>
              </div>

              <button
                onClick={() => setDone(true)}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Reserveer nu
                <ArrowRight className="size-4" />
              </button>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                Demo — er wordt niets vastgelegd of betaald.
              </p>
            </>
          )}
        </div>
      </div>
    </BrowserChrome>
  );
}

function PriceTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function DatePickerRow({
  label,
  date,
  onMinus,
  onPlus,
}: {
  label: string;
  date: Date;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-background p-2">
      <span className="px-2 text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={onMinus}
          aria-label="Eerder"
          className="grid size-7 place-items-center rounded-md border border-border text-muted-foreground hover:bg-accent"
        >
          <ChevronLeft className="size-3.5" />
        </button>
        <span className="min-w-[120px] px-2 text-center text-sm font-semibold tabular-nums">
          {format(date, "EEE d MMM", { locale: nl })}
        </span>
        <button
          onClick={onPlus}
          aria-label="Later"
          className="grid size-7 place-items-center rounded-md border border-border text-muted-foreground hover:bg-accent"
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 text-muted-foreground">
      <span>{label}</span>
      <span className="tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function SuccessState({
  start,
  end,
  total,
  onReset,
}: {
  start: Date;
  end: Date;
  total: number;
  onReset: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="grid size-14 place-items-center rounded-full bg-[oklch(0.7_0.13_150)]/20 text-[oklch(0.5_0.14_150)]">
        <Check className="size-6" strokeWidth={3} />
      </div>
      <h3 className="mt-4 text-lg font-semibold">Aanvraag verzonden</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Sloep Aurora · {format(start, "d MMM", { locale: nl })} —{" "}
        {format(end, "d MMM", { locale: nl })}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Totaal <span className="font-semibold text-foreground">€{total}</span>
      </p>
      <p className="mt-4 max-w-xs text-xs text-muted-foreground">
        In de echte versie krijgt de verhuurder direct een melding en stuurt
        binnen één werkdag een bevestiging. Wil je dit voor je eigen verhuur?
      </p>
      <div className="mt-5 flex gap-2">
        <button
          onClick={onReset}
          className="rounded-full border border-border bg-background px-4 py-2 text-xs font-medium hover:bg-accent"
        >
          Opnieuw
        </button>
        <a
          href="/register"
          className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          Start zelf met BookingBay
        </a>
      </div>
    </div>
  );
}

/* ---------------------- DASHBOARD DEMO ---------------------- */

type DashScreen = "overview" | "planning" | "bookings" | "items";

function DashboardDemo() {
  const [screen, setScreen] = useState<DashScreen>("overview");

  return (
    <BrowserChrome url="https://app.bookingbay.nl/dashboard">
      <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[200px_1fr]">
        {/* Mock sidebar */}
        <div className="hidden border-r border-border bg-muted/30 p-2 text-xs sm:block">
          <SidebarTab
            active={screen === "overview"}
            onClick={() => setScreen("overview")}
            icon={LayoutDashboard}
            label="Overzicht"
          />
          <SidebarTab
            active={screen === "planning"}
            onClick={() => setScreen("planning")}
            icon={CalendarDays}
            label="Planning"
          />
          <SidebarTab
            active={screen === "bookings"}
            onClick={() => setScreen("bookings")}
            icon={Check}
            label="Boekingen"
          />
          <SidebarTab
            active={screen === "items"}
            onClick={() => setScreen("items")}
            icon={Package}
            label="Items"
          />
        </div>

        {/* Mobile tab strip */}
        <div className="col-span-2 flex gap-1 overflow-x-auto border-b border-border bg-muted/30 p-2 sm:hidden">
          <MobileTab active={screen === "overview"} onClick={() => setScreen("overview")} label="Overzicht" />
          <MobileTab active={screen === "planning"} onClick={() => setScreen("planning")} label="Planning" />
          <MobileTab active={screen === "bookings"} onClick={() => setScreen("bookings")} label="Boekingen" />
          <MobileTab active={screen === "items"} onClick={() => setScreen("items")} label="Items" />
        </div>

        {/* Content */}
        <div className="col-span-2 min-h-[420px] p-5 sm:col-span-1 sm:p-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {screen === "overview" && <OverviewScreen />}
              {screen === "planning" && <PlanningScreen />}
              {screen === "bookings" && <BookingsScreen />}
              {screen === "items" && <ItemsScreen />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </BrowserChrome>
  );
}

function SidebarTab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Globe;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      <Icon className="size-3.5 shrink-0" />
      <span>{label}</span>
    </button>
  );
}

function MobileTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1 text-xs transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function OverviewScreen() {
  return (
    <div>
      <p className="text-xs text-muted-foreground">Overzicht</p>
      <h3 className="text-lg font-semibold">Welkom terug, Daan</h3>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Vandaag", value: "12", hint: "lopende boekingen" },
          { label: "Deze week", value: "47", hint: "totaal" },
          { label: "Items", value: "23", hint: "actief" },
          { label: "Omzet wk", value: "€4.832", hint: "netto" },
        ].map((k) => (
          <div key={k.label} className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {k.label}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{k.value}</p>
            <p className="text-[10px] text-muted-foreground">{k.hint}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between pb-2">
          <h4 className="text-sm font-semibold">Komende boekingen</h4>
          <span className="text-[10px] text-muted-foreground">5 deze week</span>
        </div>
        <ul className="divide-y divide-border text-xs">
          {[
            { time: "Ma 14:00", item: "Sloep Aurora", client: "Jan de Vries" },
            { time: "Di 09:30", item: "Bakfiets Urban", client: "Lisa Klein" },
            { time: "Wo 11:00", item: "Sloep Aurora", client: "Pieter Janssen" },
          ].map((b, i) => (
            <li key={i} className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">{b.item}</p>
                <p className="text-muted-foreground">{b.client}</p>
              </div>
              <span className="text-muted-foreground tabular-nums">{b.time}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PlanningScreen() {
  return (
    <div>
      <p className="text-xs text-muted-foreground">Planning</p>
      <h3 className="text-lg font-semibold">Week 19</h3>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px]">
        {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((d) => (
          <div key={d} className="py-1 font-medium uppercase text-muted-foreground">
            {d}
          </div>
        ))}
      </div>
      <div className="mt-2 space-y-1.5">
        {["Sloep Aurora", "Bakfiets Urban", "Sup Set Pro", "Kano Tweezit"].map(
          (item, row) => (
            <div key={item} className="grid grid-cols-7 items-center gap-1">
              {Array.from({ length: 7 }).map((_, col) => {
                const filled =
                  (row === 0 && (col === 0 || col === 1 || col === 4)) ||
                  (row === 1 && col === 1) ||
                  (row === 2 && (col === 5 || col === 6)) ||
                  (row === 3 && col === 3);
                const colors = [
                  "from-primary to-[oklch(0.55_0.18_18)]",
                  "from-[oklch(0.55_0.13_200)] to-[oklch(0.45_0.15_220)]",
                  "from-[oklch(0.7_0.15_160)] to-[oklch(0.55_0.16_180)]",
                  "from-[oklch(0.65_0.16_280)] to-[oklch(0.5_0.18_270)]",
                ];
                return (
                  <div
                    key={col}
                    className={`h-7 rounded ${
                      filled
                        ? `bg-gradient-to-r ${colors[row]}`
                        : "border border-dashed border-border bg-background"
                    }`}
                    title={filled ? `${item}` : undefined}
                  />
                );
              })}
            </div>
          ),
        )}
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">
        Ook een tijdrooster en dagweergave met uren beschikbaar.
      </p>
    </div>
  );
}

function BookingsScreen() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Boekingen</p>
          <h3 className="text-lg font-semibold">Alle reserveringen</h3>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground">
          <Plus className="size-3" />
          Nieuw
        </span>
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-[1fr_1fr_auto] border-b border-border bg-muted/40 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <span>Item</span>
          <span>Klant</span>
          <span>Status</span>
        </div>
        <ul className="divide-y divide-border bg-background text-xs">
          {[
            { item: "Sloep Aurora", client: "Jan de Vries", status: "Bevestigd", color: "bg-primary/15 text-primary" },
            { item: "Bakfiets Urban", client: "Lisa Klein", status: "In behandeling", color: "bg-[oklch(0.85_0.13_85)]/25 text-[oklch(0.45_0.13_70)]" },
            { item: "Sup Set Pro", client: "Mike Bos", status: "Lopend", color: "bg-[oklch(0.7_0.13_150)]/20 text-[oklch(0.5_0.14_150)]" },
            { item: "Kano Tweezit", client: "Sara A.", status: "Afgerond", color: "bg-muted text-muted-foreground" },
          ].map((row, i) => (
            <li key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-3 px-3 py-2">
              <span className="font-medium">{row.item}</span>
              <span className="text-muted-foreground">{row.client}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] ${row.color}`}>
                {row.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ItemsScreen() {
  const items = [
    { name: "Sloep Aurora", cat: "Boten", price: "€75 / dag", icon: Ship },
    { name: "Bakfiets Urban", cat: "Fietsen", price: "€25 / dag", icon: Package },
    { name: "Sup Set Pro", cat: "Watersport", price: "€18 / dag", icon: Users },
    { name: "Kano Tweezit", cat: "Watersport", price: "€30 / dag", icon: Users },
  ];
  return (
    <div>
      <p className="text-xs text-muted-foreground">Catalogus</p>
      <h3 className="text-lg font-semibold">Items</h3>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {items.map((it) => (
          <div
            key={it.name}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
          >
            <div className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
              <it.icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{it.name}</p>
              <p className="text-[11px] text-muted-foreground">{it.cat}</p>
            </div>
            <span className="text-xs font-semibold tabular-nums">{it.price}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
