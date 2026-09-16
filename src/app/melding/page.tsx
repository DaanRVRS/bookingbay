import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { COMPANY } from "@/lib/company";
import { ReportForm } from "./report-form";

export const metadata = {
  title: "Melding over inhoud",
  description:
    "Meld inhoud op een klantsite van BookingBay die volgens jou onrechtmatig is. Wij beoordelen elke melding en informeren je over de uitkomst.",
};

interface PageProps {
  searchParams: Promise<{ site?: string; url?: string }>;
}

export default async function MeldingPage({ searchParams }: PageProps) {
  const { site = "", url = "" } = await searchParams;
  const safeSite = /^[a-z0-9-]{1,60}$/i.test(site) ? site.toLowerCase() : "";
  const safeUrl = /^https?:\/\/\S{1,480}$/i.test(url) ? url : "";

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-primary">Melding</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Onrechtmatige inhoud melden
            </h1>
            <p className="mt-4 text-lg text-muted-foreground text-pretty">
              {COMPANY.brand} host klantsites van verhuurders. Zie je daar
              iets dat volgens jou niet mag — bijvoorbeeld jouw foto of naam
              zonder toestemming, misleidende informatie of een inbreuk op
              een recht — meld het hier.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <ReportForm site={safeSite} initialUrl={safeUrl} />
            </div>

            <aside className="flex flex-col gap-4 text-sm">
              <div className="rounded-2xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold">Wat er met je melding gebeurt</h2>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs leading-relaxed text-muted-foreground">
                  <li>
                    Je ontvangt een ontvangstbevestiging met kenmerk (als je een
                    e-mailadres opgeeft).
                  </li>
                  <li>
                    Wij beoordelen de melding zorgvuldig en zonder onnodige
                    vertraging. Waar nodig vragen we de verhuurder om een
                    reactie.
                  </li>
                  <li>
                    Is de inhoud onrechtmatig, dan verbergen of verwijderen we
                    die of schorsen we de site, en informeren we de verhuurder
                    over de reden en zijn mogelijkheid om bezwaar te maken.
                  </li>
                  <li>Je hoort van ons wat de uitkomst is.</li>
                </ol>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold">Contactpunt</h2>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Liever per e-mail, of neem je contact op namens een
                  toezichthouder of autoriteit? Ons contactpunt (Digital
                  Services Act, art. 11 en 12) is{" "}
                  <a className="underline" href={`mailto:${COMPANY.email}`}>
                    {COMPANY.email}
                  </a>
                  . Taal: Nederlands of Engels.
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {COMPANY.legalName}, {COMPANY.address}, {COMPANY.postalCode}{" "}
                  {COMPANY.city} · KvK {COMPANY.kvk}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold">Gaat het om je eigen gegevens?</h2>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Wil je gegevens laten verwijderen die je zelf bij een
                  verhuurder hebt achtergelaten (een boeking of aanvraag)? Neem
                  dan eerst contact op met die verhuurder; zie onze{" "}
                  <a className="underline" href="/privacy#eindklanten">
                    privacyverklaring
                  </a>
                  .
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
