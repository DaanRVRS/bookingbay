import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Command,
  FileText,
  Globe,
  HomeIcon,
  Inbox,
  Layers,
  Package,
  ScrollText,
  Search,
  Settings,
  TrendingUp,
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
  title: "Compact preview",
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
  { label: "Overzicht", icon: "home", active: true, count: null },
  { label: "Planning", icon: "calendar", count: null },
  { label: "Boekingen", icon: "check", count: 7 },
  { label: "Leads", icon: "inbox", count: 1 },
  { label: "Klanten", icon: "users", count: null },
  { label: "Items", icon: "package", count: 8 },
  { label: "Categorieën", icon: "layers", count: null },
  { label: "Klantsite", icon: "globe", count: null },
  { label: "Activiteitenlog", icon: "scroll", count: null },
  { label: "Team", icon: "user-cog", count: null },
  { label: "Instellingen", icon: "settings", count: null },
];

export default function CompactPreview() {
  return (
    <div className="min-h-screen bg-background text-[13px]">
      <PreviewBanner name="Compact" />

      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background">
        <div className="flex h-11 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="grid size-6 place-items-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
              B
            </div>
            <p className="text-sm font-semibold">Acme Verhuur</p>
            <span className="text-muted-foreground">▾</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex h-7 items-center gap-2 rounded-md border border-border bg-muted/40 px-2 text-xs text-muted-foreground hover:bg-accent">
              <Search className="size-3" />
              <span>Zoek…</span>
              <span className="ml-2 inline-flex items-center gap-0.5 rounded border border-border bg-background px-1 py-0 text-[9px]">
                <Command className="size-2.5" />K
              </span>
            </button>
            <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
              D
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-[200px_1fr]">
        {/* Sidebar with counts */}
        <aside className="sticky top-11 hidden h-[calc(100vh-2.75rem)] border-r border-border bg-muted/15 md:block">
          <nav className="flex flex-col gap-px p-2 text-[12px]">
            {sidebarItems.map((it, i) => {
              const Icon = navIcons[it.icon as keyof typeof navIcons];
              const isDivider =
                i === 6 || i === 7; // soft separation
              return (
                <span
                  key={it.label}
                  className={`flex items-center gap-2 rounded px-2 py-1 transition-colors ${
                    "active" in it && it.active
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  } ${isDivider ? "mt-1 border-t border-border pt-2" : ""}`}
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span className="flex-1 truncate">{it.label}</span>
                  {it.count !== null && (
                    <span className="rounded bg-muted px-1 text-[9px] font-medium tabular-nums text-muted-foreground">
                      {it.count}
                    </span>
                  )}
                </span>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="px-5 py-5">
          <div className="mx-auto max-w-6xl">
            {/* Compact header with inline KPI strip */}
            <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-base font-semibold">Overzicht</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                {previewKpis.map((k, i) => (
                  <span key={k.label} className="flex items-center gap-1.5">
                    {i > 0 && (
                      <span className="text-border" aria-hidden>
                        ·
                      </span>
                    )}
                    <span className="font-semibold tabular-nums">
                      {k.value}
                    </span>
                    <span className="text-muted-foreground">{k.label.toLowerCase()}</span>
                    {k.trend && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-[oklch(0.7_0.13_150)]/15 px-1 text-[10px] font-semibold text-[oklch(0.5_0.14_150)]">
                        <TrendingUp className="size-2.5" />
                        {k.trend}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* Two-column dense layout */}
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
              {/* Bookings */}
              <div className="overflow-hidden rounded-md border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
                  <h2 className="text-xs font-semibold">Komende boekingen</h2>
                  <Link
                    href="#"
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Alle →
                  </Link>
                </div>
                <ul className="divide-y divide-border">
                  {previewBookings.map((b, i) => (
                    <li
                      key={i}
                      className="grid grid-cols-[55px_1fr_1fr_auto] items-center gap-3 px-3 py-1.5 text-[12px] hover:bg-accent/40"
                    >
                      <span className="font-semibold tabular-nums text-muted-foreground">
                        {b.time}
                      </span>
                      <span className="truncate font-medium">{b.item}</span>
                      <span className="truncate text-muted-foreground">
                        {b.client}
                      </span>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          b.status === "Bevestigd"
                            ? "bg-primary/10 text-primary"
                            : b.status === "In behandeling"
                              ? "bg-[oklch(0.85_0.13_85)]/25 text-[oklch(0.45_0.13_70)]"
                              : "bg-[oklch(0.7_0.13_150)]/15 text-[oklch(0.5_0.14_150)]"
                        }`}
                      >
                        {b.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Side column */}
              <div className="flex flex-col gap-3">
                <div className="rounded-md border border-border bg-card p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Klantsite
                  </p>
                  <div className="mt-1.5 flex items-center justify-between text-[12px]">
                    <span className="font-medium">acme.</span>
                    <span className="inline-flex items-center gap-1 rounded bg-[oklch(0.7_0.13_150)]/15 px-1.5 text-[10px] font-semibold text-[oklch(0.5_0.14_150)]">
                      ● live
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    142 bezoekers · 8 leads (week)
                  </p>
                </div>

                <div className="rounded-md border border-border bg-card p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Activiteit
                  </p>
                  <ul className="mt-1.5 space-y-1 text-[11px]">
                    {previewActivity.map((a, i) => (
                      <li
                        key={i}
                        className="flex gap-1.5 leading-snug text-muted-foreground"
                      >
                        <span className="text-border">·</span>
                        <span>
                          <strong className="font-semibold text-foreground">
                            {a.who}
                          </strong>{" "}
                          {a.action}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Bottom row: capacity heatmap mock */}
            <div className="mt-4 rounded-md border border-border bg-card p-3">
              <div className="flex items-center justify-between pb-2">
                <h2 className="text-xs font-semibold">
                  Capaciteit komende 14 dagen
                </h2>
                <span className="text-[10px] text-muted-foreground">
                  donker = drukker
                </span>
              </div>
              <div className="grid grid-cols-14 gap-0.5">
                {Array.from({ length: 14 }).map((_, i) => {
                  const intensity = [
                    0.2, 0.4, 0.7, 0.9, 0.5, 0.3, 0.6, 0.8, 1, 0.7, 0.4, 0.5,
                    0.3, 0.6,
                  ][i];
                  return (
                    <div
                      key={i}
                      className="h-7 rounded-sm"
                      style={{
                        background: `oklch(0.66 0.19 30 / ${intensity})`,
                      }}
                      title={`Dag ${i + 1}: ${Math.round(intensity * 100)}% bezet`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
