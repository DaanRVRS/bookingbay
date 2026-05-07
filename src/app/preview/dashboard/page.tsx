import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata = {
  title: "Dashboard restyle preview",
  robots: { index: false, follow: false },
};

const variants = [
  {
    slug: "tide",
    name: "Tide",
    tag: "Coastal warm",
    summary:
      "Warme oranje accenten, golfpattern in de topbar en kleurige KPI-tegels — vriendelijk, brand-aware, behoudt huidige structuur.",
  },
  {
    slug: "atlas",
    name: "Atlas",
    tag: "Editorial bold",
    summary:
      "Magazine-stijl met grote display-typografie, één hero KPI uitgelicht en asymmetrische layout — premium, opvallend.",
  },
  {
    slug: "compact",
    name: "Compact",
    tag: "Dense pro",
    summary:
      "Linear/Notion-feel: meer info per scherm, inline KPI-strip, sidebar met telling per nav-item — voor power users.",
  },
];

export default function DashboardPreviewIndex() {
  return (
    <div className="min-h-screen bg-muted/30 py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-[oklch(0.85_0.13_85)]" />
          Preview — niet in productie
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Dashboard restyle — kies een richting
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Drie visuele varianten van de Overzicht-pagina. Klik er een aan voor
          de fullscreen preview. Geef de winnaar door, dan rollen we 'm uit
          naar het echte dashboard.
        </p>

        <div className="mt-10 grid gap-4">
          {variants.map((v) => (
            <Link
              key={v.slug}
              href={`/preview/dashboard/${v.slug}`}
              className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <span className="text-sm font-bold">
                  {v.name.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold">{v.name}</h2>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {v.tag}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {v.summary}
                </p>
              </div>
              <ArrowRight className="size-5 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
            </Link>
          ))}
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          Tip: open de drie in losse tabs voor snelle vergelijking.
        </p>
      </div>
    </div>
  );
}
