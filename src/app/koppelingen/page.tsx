import Link from "next/link";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { IntegrationCatalog } from "@/components/integrations/IntegrationCatalog";
import { CATEGORIES, INTEGRATIONS } from "@/lib/integrations/catalog";

export const metadata = {
  title: "Koppelingen — BookingBay",
  description:
    "Verbind BookingBay met je agenda, betaalprovider, boekhouding en meer. Vaste maandprijs per koppeling, bovenop je abonnement.",
};

interface PageProps {
  searchParams: Promise<{ cat?: string }>;
}

export default async function KoppelingenPage({ searchParams }: PageProps) {
  const { cat } = await searchParams;
  const initialCategory =
    cat && CATEGORIES.some((c) => c.slug === cat) ? cat : "all";
  const availableCount = INTEGRATIONS.filter((i) => i.status === "available").length;
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-medium text-primary">Koppelingen</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                Verbind BookingBay met je hele software-stack.
              </h1>
              <p className="mt-5 text-lg text-muted-foreground text-pretty">
                Sync je agenda, laat klanten direct betalen, push facturen naar
                je boekhouding — kies de koppelingen die je nodig hebt en
                betaal alleen voor wat je gebruikt.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3 text-sm">
                <Link
                  href="/register"
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 font-medium text-primary-foreground shadow-sm transition-all hover:shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--primary)_55%,transparent)]"
                >
                  Start gratis trial
                </Link>
                <Link
                  href="/#pricing"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-5 font-medium hover:bg-accent"
                >
                  Bekijk plannen
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <span>
                  <strong className="text-foreground tabular-nums">{INTEGRATIONS.length}</strong>{" "}
                  koppelingen in catalogus
                </span>
                <span>
                  <strong className="text-foreground tabular-nums">{availableCount}</strong>{" "}
                  vandaag al beschikbaar
                </span>
                <span>Vaste maandprijs per koppeling</span>
              </div>
            </div>
          </div>
        </section>

        {/* Catalogus */}
        <section className="border-b border-border py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <IntegrationCatalog
              initialCategory={initialCategory}
              detailHrefTemplate="/koppelingen/{category}/{slug}"
            />
          </div>
        </section>

        {/* Categorie-strip */}
        <section className="border-b border-border bg-muted/30 py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-balance">
                Verken per categorie
              </h2>
              <p className="mt-3 text-muted-foreground">
                Acht categorieën die de meeste verhuurbedrijven nodig hebben.
              </p>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {CATEGORIES.map((c) => {
                const count = INTEGRATIONS.filter(
                  (i) => i.categorySlug === c.slug,
                ).length;
                return (
                  <Link
                    key={c.slug}
                    href={`/koppelingen?cat=${c.slug}`}
                    className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40"
                  >
                    <p className="text-sm font-semibold tracking-tight">
                      {c.name}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {c.blurb}
                    </p>
                    <p className="mt-3 text-[11px] font-medium text-primary">
                      {count} koppeling{count === 1 ? "" : "en"} →
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Hoe werkt 't */}
        <section className="border-b border-border py-14 sm:py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-balance">
                Eerlijk geprijsd, opzegbaar per maand.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Elke koppeling heeft een eigen, vaste maandprijs bovenop je
                BookingBay-abonnement. Geen transactiekosten, geen verrassingen.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <Step
                n={1}
                title="Kies een koppeling"
                body="Blader door de catalogus en open de koppeling die je wilt."
              />
              <Step
                n={2}
                title="Activeer in één klik"
                body="Verbind je account via OAuth, of laat ons 'm voor je activeren."
              />
              <Step
                n={3}
                title="Op je volgende factuur"
                body="De maandprijs komt erbij op je BookingBay-factuur. Pauzeer wanneer je wil."
              />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <span className="grid size-8 place-items-center rounded-full bg-primary/12 text-sm font-semibold text-primary tabular-nums">
        {n}
      </span>
      <h3 className="mt-3 text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
