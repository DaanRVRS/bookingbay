import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ExternalLink, Shield } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { IntegrationLogo } from "@/components/integrations/IntegrationLogo";
import { IntegrationStatusBadge } from "@/components/integrations/IntegrationStatusBadge";
import {
  getCategory,
  getIntegration,
  integrationsByCategory,
  statusLabel,
} from "@/lib/integrations/catalog";

interface PageProps {
  params: Promise<{ category: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const def = getIntegration(slug);
  if (!def) return { title: "Koppeling niet gevonden" };
  return {
    title: `${def.name} koppeling — BookingBay`,
    description: def.tagline,
  };
}

export default async function PublicIntegrationDetail({ params }: PageProps) {
  const { category, slug } = await params;
  const def = getIntegration(slug);
  if (!def) notFound();
  // Categorie in de URL moet matchen — anders 404 om SEO-duplicates te voorkomen.
  if (def.categorySlug !== category) notFound();
  const cat = getCategory(def.categorySlug);
  if (!cat) notFound();

  const related = integrationsByCategory(cat.slug)
    .filter((i) => i.slug !== def.slug)
    .slice(0, 3);

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="border-b border-border bg-muted/30">
          <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
            <nav className="flex flex-wrap items-center gap-1 text-[12px] text-muted-foreground">
              <Link href="/koppelingen" className="hover:text-foreground">
                Koppelingen
              </Link>
              <span>/</span>
              <Link
                href={`/koppelingen?cat=${cat.slug}`}
                className="hover:text-foreground"
              >
                {cat.name}
              </Link>
              <span>/</span>
              <span className="text-foreground">{def.name}</span>
            </nav>
          </div>
        </div>

        {/* Hero */}
        <section className="border-b border-border py-12 sm:py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
              <div>
                <div className="flex items-center gap-3">
                  <IntegrationLogo integration={def} size="lg" />
                  <IntegrationStatusBadge catalogStatus={def.status} />
                </div>
                <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                  {def.name} koppeling
                </h1>
                <p className="mt-4 text-lg text-muted-foreground text-pretty">
                  {def.tagline}
                </p>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-foreground/90">
                  {def.description[0]}
                </p>
                {def.vendorUrl && (
                  <a
                    href={def.vendorUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  >
                    Naar {def.name} <ExternalLink className="size-3" />
                  </a>
                )}
              </div>

              {/* CTA-paneel */}
              <aside>
                <div className="rounded-2xl border border-border bg-card p-6">
                  <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    Prijs
                  </p>
                  <p className="mt-1 text-4xl font-semibold tabular-nums">
                    {def.monthlyPriceEuro === 0 ? "Gratis" : `€${def.monthlyPriceEuro}`}
                    {def.monthlyPriceEuro > 0 && (
                      <span className="ml-1 text-sm font-normal text-muted-foreground">
                        / maand
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {def.monthlyPriceEuro === 0
                      ? "Inbegrepen — geen extra kosten"
                      : "Bovenop je BookingBay-abonnement"}
                  </p>

                  <div className="my-5 h-px bg-border" />

                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {def.status === "available"
                      ? "Activeer deze koppeling vanuit je BookingBay-dashboard zodra je ingelogd bent."
                      : def.status === "beta"
                        ? "In beta — laat je gegevens achter, we activeren 'm samen met je."
                        : "Nog niet beschikbaar — laat ons weten dat je 'm wil, dan krijg je als eerste bericht zodra 'ie live gaat."}
                  </p>

                  <div className="mt-4 flex flex-col gap-2">
                    <Link
                      href="/register"
                      className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--primary)_55%,transparent)]"
                    >
                      Start gratis trial
                    </Link>
                    <Link
                      href={`/login?next=${encodeURIComponent(`/dashboard/integrations/${def.slug}`)}`}
                      className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-5 text-sm font-medium hover:bg-accent"
                    >
                      Heb al een account
                    </Link>
                  </div>
                </div>

                <p className="mt-3 px-1 text-[11px] text-muted-foreground">
                  Vragen?{" "}
                  <Link
                    href={`/contact?topic=anders`}
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Mail ons
                  </Link>{" "}
                  — we denken graag mee.
                </p>
              </aside>
            </div>
          </div>
        </section>

        {/* Lange beschrijving */}
        {def.description.length > 1 && (
          <section className="border-b border-border py-12 sm:py-16">
            <div className="mx-auto max-w-3xl px-4 sm:px-6">
              <h2 className="text-2xl font-semibold tracking-tight">
                Hoe werkt deze koppeling?
              </h2>
              <div className="mt-4 flex flex-col gap-4 text-base leading-relaxed text-muted-foreground">
                {def.description.slice(1).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Features */}
        <section className="border-b border-border bg-muted/30 py-12 sm:py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight">Wat krijg je</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {def.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[oklch(0.7_0.13_150)]/15 text-[oklch(0.5_0.14_150)]">
                    <Check className="size-3" />
                  </span>
                  <span className="text-sm leading-relaxed">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Scopes / privacy */}
        {def.scopes && def.scopes.length > 0 && (
          <section className="border-b border-border py-12 sm:py-16">
            <div className="mx-auto max-w-3xl px-4 sm:px-6">
              <div className="flex items-center gap-2">
                <Shield className="size-5 text-muted-foreground" />
                <h2 className="text-2xl font-semibold tracking-tight">
                  Privacy &amp; rechten
                </h2>
              </div>
              <p className="mt-3 text-muted-foreground">
                We vragen alleen de toegang die strikt nodig is om de
                koppeling te laten werken.
              </p>
              <ul className="mt-5 flex flex-col gap-2">
                {def.scopes.map((s) => (
                  <li
                    key={s}
                    className="rounded-lg border border-border bg-card px-4 py-3 text-sm"
                  >
                    {s}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-xs text-muted-foreground">
                Je kunt de koppeling op elk moment pauzeren of intrekken
                vanuit je dashboard.
              </p>
            </div>
          </section>
        )}

        {/* FAQ */}
        {def.faq && def.faq.length > 0 && (
          <section className="border-b border-border bg-muted/30 py-12 sm:py-16">
            <div className="mx-auto max-w-3xl px-4 sm:px-6">
              <h2 className="text-2xl font-semibold tracking-tight">
                Veelgestelde vragen
              </h2>
              <div className="mt-6 flex flex-col gap-2">
                {def.faq.map((qa) => (
                  <details
                    key={qa.q}
                    className="group rounded-xl border border-border bg-card p-5 open:bg-background"
                  >
                    <summary className="cursor-pointer list-none text-base font-medium tracking-tight marker:hidden">
                      <span className="flex items-center justify-between gap-3">
                        {qa.q}
                        <span className="text-muted-foreground transition-transform group-open:rotate-180">
                          ▾
                        </span>
                      </span>
                    </summary>
                    <p className="mt-3 leading-relaxed text-muted-foreground">
                      {qa.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Gerelateerd */}
        {related.length > 0 && (
          <section className="border-b border-border py-12 sm:py-16">
            <div className="mx-auto max-w-5xl px-4 sm:px-6">
              <div className="flex items-end justify-between gap-3">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Ook in {cat.name}
                </h2>
                <Link
                  href={`/koppelingen?cat=${cat.slug}`}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Bekijk alle {cat.name.toLowerCase()} →
                </Link>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {related.map((i) => (
                  <Link
                    key={i.slug}
                    href={`/koppelingen/${i.categorySlug}/${i.slug}`}
                    className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <IntegrationLogo integration={i} size="md" />
                      <span className="text-[10px] text-muted-foreground">
                        {statusLabel(i.status)}
                      </span>
                    </div>
                    <h3 className="mt-4 text-sm font-semibold tracking-tight">
                      {i.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {i.tagline}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA-strip */}
        <section className="py-14 sm:py-16">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Klaar om {def.name} te koppelen?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Start een gratis trial van 14 dagen. Voeg de koppeling pas toe
              zodra je &lsquo;m écht nodig hebt — geen verrassingen op je factuur.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--primary)_55%,transparent)]"
              >
                Start gratis trial
              </Link>
              <Link
                href="/koppelingen"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-6 text-sm font-medium hover:bg-accent"
              >
                Bekijk alle koppelingen
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
