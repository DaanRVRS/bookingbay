import Link from "next/link";
import Image from "next/image";
import { Logo } from "./Logo";
import { StatusIndicator } from "./StatusIndicator";
import { COMPANY, companyAddressLine, companyPhoneHref } from "@/lib/company";

const cols = [
  {
    title: "Product",
    links: [
      { href: "/#use-cases", label: "Voor wie" },
      { href: "/#features", label: "Functies" },
      { href: "/koppelingen", label: "Koppelingen" },
      { href: "/#pricing", label: "Prijzen" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "Bedrijf",
    links: [
      { href: "/over", label: "Over ons" },
      { href: "/blog", label: "Blog" },
      { href: "/contact", label: "Contact" },
      { href: "/melding", label: "Melding over inhoud" },
    ],
  },
  {
    title: "Juridisch",
    links: [
      { href: "/voorwaarden", label: "Algemene voorwaarden" },
      { href: "/privacy", label: "Privacy" },
      { href: "/verwerkersovereenkomst", label: "Verwerkersovereenkomst" },
      { href: "/toegankelijkheid", label: "Toegankelijkheid" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Verhuur-administratie zonder gedoe. Eén plek voor je planning, klanten en eigen
              boekingssite.
            </p>
            {/* Groene hosting, te controleren bij de Green Web Foundation. Het
                badge staat hier zelf gehost, zodat bezoekers geen verzoek naar
                een derde partij doen; het beeld zelf is onveranderd. */}
            <a
              href="https://www.thegreenwebfoundation.org/green-web-check/?url=www.bookingbay.nl"
              target="_blank"
              rel="noopener noreferrer"
              title="Groene hosting, geverifieerd door de Green Web Foundation"
              className="mt-5 block w-fit rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Image
                src="/badges/green-web-foundation.png"
                alt="bookingbay.nl draait op groene hosting, geverifieerd door de Green Web Foundation"
                width={300}
                height={135}
                className="h-12 w-auto"
              />
            </a>
            <address className="mt-6 text-xs not-italic leading-relaxed text-muted-foreground">
              {COMPANY.brand} is een dienst van {COMPANY.legalName}
              <br />
              {companyAddressLine()}
              <br />
              KvK {COMPANY.kvk} · btw {COMPANY.vat}
              <br />
              <a href={`mailto:${COMPANY.email}`} className="hover:text-foreground">
                {COMPANY.email}
              </a>{" "}
              ·{" "}
              <a href={companyPhoneHref()} className="hover:text-foreground">
                {COMPANY.phone}
              </a>
            </address>
            <p className="mt-4 text-xs text-muted-foreground">
              Gemaakt in Nederland · Hosting in Europa
            </p>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold">{col.title}</h4>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} {COMPANY.legalName}. Alle rechten voorbehouden.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/api/health" className="hover:text-foreground">
              Status
            </Link>
            <StatusIndicator />
          </div>
        </div>
      </div>
    </footer>
  );
}
