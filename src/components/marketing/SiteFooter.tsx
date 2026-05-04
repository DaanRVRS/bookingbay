import Link from "next/link";
import { Logo } from "./Logo";

const cols = [
  {
    title: "Product",
    links: [
      { href: "#use-cases", label: "Voor wie" },
      { href: "#features", label: "Functies" },
      { href: "#pricing", label: "Prijzen" },
      { href: "#faq", label: "FAQ" },
    ],
  },
  {
    title: "Bedrijf",
    links: [
      { href: "/over", label: "Over ons" },
      { href: "/blog", label: "Blog" },
      { href: "mailto:hallo@bookingbay.nl", label: "Contact" },
    ],
  },
  {
    title: "Juridisch",
    links: [
      { href: "/voorwaarden", label: "Algemene voorwaarden" },
      { href: "/privacy", label: "Privacy" },
      { href: "/verwerkersovereenkomst", label: "Verwerkersovereenkomst" },
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
            <p className="mt-6 text-xs text-muted-foreground">
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
          <p>© {new Date().getFullYear()} BookingBay. Alle rechten voorbehouden.</p>
          <div className="flex items-center gap-4">
            <Link href="/api/health" className="hover:text-foreground">
              Status
            </Link>
            <span className="size-1.5 rounded-full bg-[oklch(0.7_0.13_150)]" aria-hidden />
            <span>Alle systemen operationeel</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
