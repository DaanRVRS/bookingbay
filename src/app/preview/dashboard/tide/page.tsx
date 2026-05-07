import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
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
  title: "Tide preview",
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

const sidebarGroups = [
  {
    items: [
      { label: "Overzicht", icon: "home", active: true },
      { label: "Planning", icon: "calendar" },
      { label: "Boekingen", icon: "check" },
      { label: "Leads", icon: "inbox" },
      { label: "Klanten", icon: "users" },
    ],
  },
  {
    title: "Catalogus",
    items: [
      { label: "Items", icon: "package" },
      { label: "Categorieën", icon: "layers" },
    ],
  },
  {
    title: "Configuratie",
    items: [
      { label: "Klantsite", icon: "globe" },
      { label: "Pagina's", icon: "file-text" },
      { label: "Team", icon: "user-cog" },
      { label: "Activiteitenlog", icon: "scroll" },
      { label: "Instellingen", icon: "settings" },
    ],
  },
] as const;

const kpiAccents = [
  "from-[oklch(0.95_0.06_30)] to-[oklch(0.92_0.08_30)] text-[oklch(0.45_0.13_30)]",
  "from-[oklch(0.95_0.05_200)] to-[oklch(0.92_0.07_220)] text-[oklch(0.4_0.13_220)]",
  "from-[oklch(0.95_0.05_160)] to-[oklch(0.92_0.07_170)] text-[oklch(0.4_0.13_160)]",
  "from-[oklch(0.95_0.05_280)] to-[oklch(0.92_0.07_270)] text-[oklch(0.4_0.13_270)]",
];

export default function TidePreview() {
  return (
    <div className="min-h-screen bg-[oklch(0.985_0.008_60)]">
      <PreviewBanner name="Tide" />

      {/* Topbar with subtle wave */}
      <header
        className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 56' preserveAspectRatio='none'><path d='M0,28 Q120,8 240,28 T480,28 T720,28 T960,28 T1200,28 T1440,28 V56 H0 Z' fill='%23ef5934' fill-opacity='0.04'/><path d='M0,38 Q120,18 240,38 T480,38 T720,38 T960,38 T1200,38 T1440,38 V56 H0 Z' fill='%23ef5934' fill-opacity='0.06'/></svg>\")",
          backgroundSize: "100% 100%",
        }}
      >
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-[oklch(0.55_0.18_18)] text-white shadow-sm">
              <span className="text-xs font-bold">B</span>
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">BookingBay</p>
              <p className="text-[10px] leading-tight text-muted-foreground">
                Acme Verhuur
              </p>
            </div>
          </div>
          <div className="hidden flex-1 items-center justify-center px-8 md:flex">
            <div className="flex h-8 w-full max-w-md items-center gap-2 rounded-full border border-border bg-background/80 px-3 text-xs text-muted-foreground">
              <Search className="size-3.5" />
              <span>Zoek items, klanten, boekingen…</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="grid size-8 place-items-center rounded-full bg-muted/50 text-xs font-semibold text-foreground">
              D
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-[240px_1fr]">
        {/* Sidebar — soft cream tint */}
        <aside
          className="sticky top-14 hidden h-[calc(100vh-3.5rem)] border-r border-border md:block"
          style={{
            background:
              "linear-gradient(180deg, oklch(0.98 0.015 60) 0%, oklch(0.985 0.008 80) 100%)",
          }}
        >
          <nav className="flex flex-col gap-5 px-3 py-4 text-sm">
            {sidebarGroups.map((group, gi) => (
              <div key={gi} className="flex flex-col gap-0.5">
                {"title" in group && group.title && (
                  <p className="px-3 pb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {group.title}
                  </p>
                )}
                {group.items.map((it) => {
                  const Icon = navIcons[it.icon as keyof typeof navIcons];
                  return (
                    <span
                      key={it.label}
                      className={`flex items-center gap-2.5 rounded-md px-3 py-2 transition-colors ${
                        "active" in it && it.active
                          ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary shadow-[inset_2px_0_0] shadow-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span>{it.label}</span>
                    </span>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="px-6 py-8 sm:px-10">
          <div className="mx-auto max-w-6xl">
            <div>
              <p className="text-sm text-muted-foreground">Overzicht</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                Welkom terug, Daan
                <span className="ml-2 text-2xl">🌊</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Hier draait je verhuur deze week — alles in één blik.
              </p>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {previewKpis.map((k, i) => (
                <div
                  key={k.label}
                  className={`relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br p-5 ${kpiAccents[i]}`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                    {k.label}
                  </p>
                  <p className="mt-2 text-3xl font-bold tabular-nums">
                    {k.value}
                  </p>
                  <p className="mt-0.5 text-[11px] opacity-80">{k.hint}</p>
                  {k.trend && (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-0.5 rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm">
                      <TrendingUp className="size-3" />
                      {k.trend}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-7 grid gap-5 lg:grid-cols-3">
              <div className="overflow-hidden rounded-2xl border border-border bg-card lg:col-span-2">
                <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-primary/5 to-transparent px-5 py-3">
                  <h2 className="text-base font-semibold">
                    Komende boekingen
                  </h2>
                  <Link
                    href="#"
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Alle boekingen <ArrowRight className="size-3" />
                  </Link>
                </div>
                <ul className="divide-y divide-border">
                  {previewBookings.slice(0, 4).map((b, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-4 px-5 py-3 text-sm"
                    >
                      <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-xs font-semibold tabular-nums text-primary">
                        {b.time}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{b.item}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {b.client}
                        </p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                        {b.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-5">
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Klantsite
                  </p>
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary/10 to-transparent px-3 py-2 text-sm font-medium">
                    <Globe className="size-4 text-primary" />
                    acme.bookingbay.nl
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Live · 142 bezoekers deze week
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Recent
                  </p>
                  <ul className="mt-3 space-y-2 text-xs">
                    {previewActivity.slice(0, 3).map((a, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary/60" />
                        <span>
                          <strong className="font-medium">{a.who}</strong>{" "}
                          <span className="text-muted-foreground">
                            {a.action}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
