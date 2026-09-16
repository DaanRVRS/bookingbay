import { Building2, Mail, MessageCircle, Phone } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { COMPANY, companyAddressLine, companyPhoneHref } from "@/lib/company";
import { MarketingContactForm } from "./contact-form";

export const metadata = {
  title: "Contact",
  description:
    "Vragen, demo aanvragen, of even sparren? Stuur ons een bericht of bel.",
};

interface PageProps {
  searchParams: Promise<{ topic?: string }>;
}

export default async function ContactPage({ searchParams }: PageProps) {
  const { topic } = await searchParams;
  const initialTopic =
    topic === "demo" || topic === "vraag" || topic === "anders"
      ? topic
      : "demo";
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-primary">Contact</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Even sparren?
            </h1>
            <p className="mt-4 text-lg text-muted-foreground text-pretty">
              Vraag een demo aan, stel een vraag, of vertel wat je nodig hebt.
              We reageren meestal binnen één werkdag.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_320px]">
            {/* Form */}
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <MarketingContactForm initialTopic={initialTopic} />
            </div>

            {/* Contact methods */}
            <aside className="flex flex-col gap-3">
              <ContactMethod
                icon={Mail}
                label="E-mail"
                value={COMPANY.email}
                href={`mailto:${COMPANY.email}`}
                hint="Ook voor privacyverzoeken, meldingen over inhoud en beveiligingsmeldingen."
              />
              <ContactMethod
                icon={Phone}
                label="Telefoon"
                value={COMPANY.phone}
                href={companyPhoneHref()}
                hint="Op werkdagen 9:00 – 17:00"
              />
              <ContactMethod
                icon={MessageCircle}
                label="Klantsupport"
                value="Open een ticket"
                href="/dashboard/support"
                hint="Bestaande klant? Log in en open direct een support-ticket — we reageren binnen één werkdag."
              />
              <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="size-4" />
                  </span>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Bedrijfsgegevens
                  </p>
                </div>
                <address className="text-sm not-italic leading-relaxed">
                  <span className="font-semibold">{COMPANY.legalName}</span>
                  <br />
                  {companyAddressLine()}
                  <br />
                  <span className="text-xs text-muted-foreground">
                    KvK {COMPANY.kvk} · btw {COMPANY.vat}
                  </span>
                </address>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function ContactMethod({
  icon: Icon,
  label,
  value,
  href,
  hint,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  href: string;
  hint?: string;
}) {
  return (
    <a
      href={href}
      className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-card/80"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="text-base font-semibold">{value}</p>
      {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </a>
  );
}
