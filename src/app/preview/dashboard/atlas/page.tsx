import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  FileText,
  Globe,
  HomeIcon,
  Inbox,
  Layers,
  Package,
  ScrollText,
  Settings,
  UserCog,
  Users,
} from "lucide-react";
import { PreviewBanner } from "../PreviewBanner";
import {
  previewActivity,
  previewBookings,
  previewKpis,
} from "../preview-data";

export const metadata = {
  title: "Atlas preview",
  robots: { index: false, follow: false },
};

const navIcons = {
  home: HomeIcon,
  calendar: Calendar,
  check: CheckCircle2,
  inbox: Inbox,
  users: Users,
  package: Package,
  layers: Layers,
  globe: Globe,
  scroll: ScrollText,
  "user-cog": UserCog,
  settings: Settings,
  "file-text": FileText,
};

const sidebarItems = [
  { label: "Overzicht", icon: "home", active: true },
  { label: "Planning", icon: "calendar" },
  { label: "Boekingen", icon: "check" },
  { label: "Leads", icon: "inbox" },
  { label: "Klanten", icon: "users" },
  { label: "Items", icon: "package" },
  { label: "Categorieën", icon: "layers" },
  { label: "Klantsite", icon: "globe" },
  { label: "Activiteitenlog", icon: "scroll" },
  { label: "Team", icon: "user-cog" },
  { label: "Instellingen", icon: "settings" },
];

export default function AtlasPreview() {
  const today = new Date().toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-[oklch(0.98_0.005_90)]">
      <PreviewBanner name="Atlas" />

      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background">
        <div className="flex h-14 items-center justify-between px-8">
          <div className="flex items-center gap-6">
            <p className="font-serif text-base font-bold italic tracking-tight">
              BookingBay
            </p>
            <span className="h-4 w-px bg-border" />
            <p className="text-sm text-muted-foreground">Acme Verhuur ▾</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Daan
            </span>
            <span className="size-2 rounded-full bg-[oklch(0.7_0.13_150)]" />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-[200px_1fr]">
        {/* Sidebar — caps lock editorial */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] border-r border-border bg-background md:block">
          <nav className="flex flex-col px-4 py-6 text-[10px] font-semibold uppercase tracking-[0.18em]">
            {sidebarItems.map((it) => {
              const Icon = navIcons[it.icon as keyof typeof navIcons];
              return (
                <span
                  key={it.label}
                  className={`group flex items-center gap-3 border-l-2 px-3 py-2.5 transition-colors ${
                    it.active
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span>{it.label}</span>
                </span>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="px-8 py-12 sm:px-14">
          <div className="mx-auto max-w-5xl">
            {/* Editorial header */}
            <div className="border-b-2 border-foreground pb-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Overzicht — {today}
              </p>
              <h1 className="mt-3 font-serif text-5xl font-bold leading-none tracking-tight sm:text-6xl">
                Goedemorgen
                <br />
                <span className="text-primary italic">Daan.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base text-muted-foreground">
                Vandaag {previewKpis[0].value} lopende boekingen, {" "}
                {previewKpis[3].value} omzet voorspeld voor deze week —{" "}
                {previewKpis[3].trend} t.o.v. vorige week.
              </p>
            </div>

            {/* Asymmetric KPI grid */}
            <div className="mt-10 grid gap-4 lg:grid-cols-[2fr_1fr_1fr]">
              {/* Hero KPI */}
              <div className="relative overflow-hidden rounded-3xl bg-foreground p-8 text-background">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-70">
                      {previewKpis[0].label}
                    </p>
                    <p className="mt-3 font-serif text-7xl font-bold leading-none tabular-nums">
                      {previewKpis[0].value}
                    </p>
                    <p className="mt-2 text-sm opacity-80">
                      {previewKpis[0].hint}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    <ArrowUpRight className="size-3.5" />
                    {previewKpis[0].trend}
                  </span>
                </div>
                {/* Editorial flourish */}
                <svg
                  className="absolute -right-4 -bottom-4 size-32 opacity-10"
                  viewBox="0 0 100 100"
                  fill="currentColor"
                >
                  <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="2" fill="none" />
                  <circle cx="50" cy="50" r="36" stroke="currentColor" strokeWidth="1" fill="none" />
                  <circle cx="50" cy="50" r="24" stroke="currentColor" strokeWidth="0.5" fill="none" />
                </svg>
              </div>

              {previewKpis.slice(1, 3).map((k) => (
                <div
                  key={k.label}
                  className="rounded-3xl border border-border bg-card p-6"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {k.label}
                  </p>
                  <p className="mt-3 font-serif text-4xl font-bold tabular-nums">
                    {k.value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{k.hint}</p>
                </div>
              ))}
            </div>

            {/* Section divider */}
            <div className="mt-14 border-t border-border pt-10">
              <div className="flex items-baseline justify-between">
                <h2 className="font-serif text-2xl font-bold tracking-tight">
                  Komende boekingen
                </h2>
                <Link
                  href="#"
                  className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
                >
                  Alle boekingen →
                </Link>
              </div>

              <ul className="mt-6 divide-y divide-border border-y border-border">
                {previewBookings.slice(0, 4).map((b, i) => (
                  <li
                    key={i}
                    className="grid grid-cols-[60px_1fr_auto] items-center gap-6 py-5 text-sm"
                  >
                    <span className="font-serif text-2xl font-bold tabular-nums leading-none">
                      {b.time}
                    </span>
                    <div>
                      <p className="font-semibold">{b.item}</p>
                      <p className="text-xs text-muted-foreground">{b.client}</p>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {b.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Side panels */}
            <div className="mt-14 grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-border bg-card p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Klantsite
                </p>
                <p className="mt-3 font-serif text-2xl font-bold">
                  acme.bookingbay.nl
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Live · 142 unieke bezoekers · 8 leads deze week
                </p>
                <Link
                  href="#"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  Beheer site <ArrowRight className="size-3" />
                </Link>
              </div>

              <div className="rounded-3xl border border-border bg-card p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Recent
                </p>
                <ul className="mt-3 space-y-2.5 text-xs">
                  {previewActivity.slice(0, 4).map((a, i) => (
                    <li key={i}>
                      <strong className="font-semibold">{a.who}</strong>{" "}
                      <span className="text-muted-foreground">{a.action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
