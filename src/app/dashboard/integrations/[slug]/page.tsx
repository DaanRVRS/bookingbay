import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { AlertTriangle, Check, CheckCircle2, ExternalLink, Shield } from "lucide-react";
import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { IntegrationLogo } from "@/components/integrations/IntegrationLogo";
import { IntegrationStatusBadge } from "@/components/integrations/IntegrationStatusBadge";
import { getCategory, getIntegration } from "@/lib/integrations/catalog";
import { getOrgIntegration } from "@/lib/integrations/queries";
import { readPaymentConfig, isActivePaymentProvider } from "@/lib/payments/config";
import type { CalendarListEntry } from "@/lib/integrations/google-calendar";
import { ActivationActions } from "./activation-actions";
import { GoogleCalendarSetup } from "./google-calendar-setup";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ oauth_success?: string; oauth_error?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const def = getIntegration(slug);
  return { title: def ? `${def.name} · Koppelingen` : "Koppeling" };
}

export default async function IntegrationDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const def = getIntegration(slug);
  if (!def) notFound();
  const cat = getCategory(def.categorySlug);

  const ctx = await requireOrg();
  const orgRow = await getOrgIntegration(ctx.organization.id, def.slug);

  // Self-serve koppelingen (Mollie/Stripe) lopen niet via de aanvraag-flow,
  // maar via Instellingen > Betalen. Status leiden we af uit de payment-config.
  const isSelfServe = Boolean(def.selfServeConfigPath);
  const paymentCfg = isSelfServe
    ? await readPaymentConfig(ctx.organization.id)
    : null;
  const selfServeActive = paymentCfg
    ? isActivePaymentProvider(paymentCfg, def.slug)
    : false;

  // Lees account-email / scopes / lastSyncAt uit de config. Niet-encrypted
  // velden zijn meteen leesbaar — we hoeven hier geen tokens te decrypten.
  const rawConfig = (orgRow?.config as Record<string, unknown> | null) ?? null;
  const accountEmail =
    rawConfig && typeof rawConfig.accountEmail === "string"
      ? rawConfig.accountEmail
      : null;
  const calendarId =
    rawConfig && typeof rawConfig.calendarId === "string"
      ? rawConfig.calendarId
      : null;

  // Google Calendar koppeling: laat de items + cached calendar-list zien
  // zodat de klant per-item een agenda kan kiezen.
  const isActiveGoogleCalendar =
    def.slug === "google-calendar" && orgRow?.status === "ACTIVE";
  const cachedCalendars: CalendarListEntry[] = (() => {
    if (!isActiveGoogleCalendar || !rawConfig) return [];
    const list = rawConfig.calendars;
    return Array.isArray(list) ? (list as CalendarListEntry[]) : [];
  })();
  const calendarsCachedAt =
    rawConfig && typeof rawConfig.calendarsCachedAt === "number"
      ? rawConfig.calendarsCachedAt
      : null;
  const items = isActiveGoogleCalendar
    ? await db.item.findMany({
        where: { organizationId: ctx.organization.id, isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, integrationConfig: true },
      })
    : [];
  const itemsForSetup = items.map((it) => {
    const cfg = (it.integrationConfig as Record<string, unknown> | null) ?? null;
    const gc =
      (cfg?.googleCalendar as { calendarId?: string } | undefined) ?? undefined;
    return { id: it.id, name: it.name, calendarId: gc?.calendarId ?? null };
  });

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title={def.name}
          description={def.tagline}
          back={{ href: "/dashboard/integrations", label: "Alle koppelingen" }}
        />

        {/* OAuth-flash messages (redirect-resultaat) */}
        {sp.oauth_success && (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-[oklch(0.7_0.13_150)]/40 bg-[oklch(0.95_0.05_150)] px-4 py-3 text-sm dark:bg-[oklch(0.3_0.08_150)]">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[oklch(0.5_0.14_150)]" />
            <p>
              <strong>{def.name} is verbonden.</strong> Vanaf nu syncen we
              automatisch alle nieuwe boekingen.
            </p>
          </div>
        )}
        {sp.oauth_error && (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div>
              <strong>Verbinden mislukt.</strong>{" "}
              <span className="text-muted-foreground">{sp.oauth_error}</span>
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
          <article className="flex flex-col gap-8">
            {/* Hero / korte info */}
            <section className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
              <IntegrationLogo integration={def} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <IntegrationStatusBadge
                    catalogStatus={def.status}
                    orgStatus={
                      isSelfServe
                        ? selfServeActive
                          ? "ACTIVE"
                          : null
                        : (orgRow?.status ?? null)
                    }
                  />
                  {cat && (
                    <Link
                      href="/dashboard/integrations"
                      className="text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      {cat.name}
                    </Link>
                  )}
                  {def.vendorUrl && (
                    <a
                      href={def.vendorUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      Provider <ExternalLink className="size-2.5" />
                    </a>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                  {def.description[0]}
                </p>
              </div>
            </section>

            {/* Google Calendar setup-panel — alleen tonen wanneer actief */}
            {isActiveGoogleCalendar && (
              <GoogleCalendarSetup
                defaultCalendarId={calendarId}
                calendars={cachedCalendars}
                calendarsCachedAt={calendarsCachedAt}
                items={itemsForSetup}
              />
            )}

            {/* Lange beschrijving */}
            {def.description.length > 1 && (
              <section>
                <h2 className="text-base font-semibold tracking-tight">
                  Hoe werkt {def.name}?
                </h2>
                <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
                  {def.description.slice(1).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </section>
            )}

            {/* Wat krijg je */}
            <section>
              <h2 className="text-base font-semibold tracking-tight">Wat krijg je</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {def.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 rounded-lg border border-border/60 bg-background/40 p-3"
                  >
                    <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-[oklch(0.7_0.13_150)]/15 text-[oklch(0.5_0.14_150)]">
                      <Check className="size-2.5" />
                    </span>
                    <span className="text-sm">{f}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Permissies */}
            {def.scopes && def.scopes.length > 0 && (
              <section className="rounded-xl border border-border bg-muted/30 p-5">
                <div className="flex items-center gap-2">
                  <Shield className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">Wat vragen we aan rechten?</h2>
                </div>
                <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                  {def.scopes.map((s) => (
                    <li key={s}>• {s}</li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Je kunt de koppeling op elk moment pauzeren of intrekken.
                </p>
              </section>
            )}

            {/* FAQ */}
            {def.faq && def.faq.length > 0 && (
              <section>
                <h2 className="text-base font-semibold tracking-tight">
                  Veelgestelde vragen
                </h2>
                <div className="mt-3 flex flex-col gap-2">
                  {def.faq.map((qa) => (
                    <details
                      key={qa.q}
                      className="group rounded-lg border border-border bg-card p-4 open:bg-background"
                    >
                      <summary className="cursor-pointer list-none text-sm font-medium tracking-tight marker:hidden">
                        <span className="flex items-center justify-between gap-3">
                          {qa.q}
                          <span className="text-muted-foreground transition-transform group-open:rotate-180">
                            ▾
                          </span>
                        </span>
                      </summary>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {qa.a}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            )}
          </article>

          {/* Sticky activatie-paneel rechts */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Prijs
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">
                {def.monthlyPriceEuro === 0 ? (
                  "Gratis"
                ) : (
                  <>
                    €{def.monthlyPriceEuro}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      / maand
                    </span>
                  </>
                )}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {def.monthlyPriceEuro === 0
                  ? "Inbegrepen bij elk abonnement"
                  : "Bovenop je BookingBay-abonnement"}
              </p>

              {/* Verbindings-info: alleen tonen wanneer koppeling actief is */}
              {orgRow?.status === "ACTIVE" && accountEmail && (
                <>
                  <div className="my-4 h-px bg-border" />
                  <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    Verbonden als
                  </p>
                  <p className="mt-1 break-all text-sm font-medium">{accountEmail}</p>
                  {calendarId && calendarId !== "primary" && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Agenda: {calendarId}
                    </p>
                  )}
                  {orgRow.lastSyncAt && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Laatst gesynchroniseerd op{" "}
                      {format(orgRow.lastSyncAt, "d MMM yyyy HH:mm", { locale: nl })}
                    </p>
                  )}
                </>
              )}

              <div className="my-4 h-px bg-border" />

              {isSelfServe && def.selfServeConfigPath ? (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">
                    {selfServeActive
                      ? `${def.name} is je actieve betaalmethode. Beheer je provider of API-key in de betaalinstellingen.`
                      : `Geen aanvraag nodig — stel dit direct zelf in. Vul je ${def.name}-key in bij de betaalinstellingen en je accepteert meteen online betalingen.`}
                  </p>
                  <Link
                    href={def.selfServeConfigPath}
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
                  >
                    {selfServeActive
                      ? "Beheer in betaalinstellingen"
                      : "Naar betaalinstellingen"}
                  </Link>
                </div>
              ) : (
                <>
                  <ActivationActions
                    slug={def.slug}
                    catalogStatus={def.status}
                    orgStatus={orgRow?.status ?? null}
                    vendorUrl={def.vendorUrl}
                    monthlyPriceEuro={def.monthlyPriceEuro}
                  />

                  {orgRow?.supportTicketId && (
                    <Link
                      href={`/dashboard/support/${orgRow.supportTicketId}`}
                      className="mt-4 block text-center text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    >
                      Open support-ticket
                    </Link>
                  )}
                </>
              )}
            </div>

            <p className="mt-3 px-1 text-[11px] text-muted-foreground">
              Vragen?{" "}
              <a
                className="underline underline-offset-2 hover:text-foreground"
                href="mailto:hallo@bookingbay.nl"
              >
                Mail ons
              </a>{" "}
              — we denken graag mee.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

