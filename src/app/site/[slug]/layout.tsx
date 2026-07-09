import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Inter,
  Lora,
  Montserrat,
  Playfair_Display,
  Plus_Jakarta_Sans,
  Poppins,
} from "next/font/google";
import "../../globals.css";
import { getOrgBySlug } from "@/lib/tenants/queries";
import { getTenantBasePath, tenantHref } from "@/lib/tenants/base-path";
import { safeParseSiteTheme, type SiteFontKey } from "@/lib/orgs/site-schemas";
import { getNavPages } from "@/lib/pages/queries";
import { planLimits } from "@/lib/plans";
import { TenantMobileNav } from "@/components/tenants/TenantMobileNav";

// Alle kiesbare site-lettertypes. Ze zetten allemaal dezelfde CSS-var
// (--font-geist-sans) waar font-sans/font-heading op draaien — welke er
// werkelijk actief is bepaalt de tenant via siteTheme.font. next/font laadt
// alleen het toegepaste font in de pagina.
const fontJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  weight: ["400", "500", "600", "700", "800"],
});
const fontInter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});
const fontPoppins = Poppins({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  weight: ["400", "500", "600", "700"],
});
const fontMontserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});
const fontLora = Lora({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});
const fontPlayfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const SITE_FONT_MAP: Record<SiteFontKey, { variable: string }> = {
  jakarta: fontJakarta,
  inter: fontInter,
  poppins: fontPoppins,
  montserrat: fontMontserrat,
  lora: fontLora,
  playfair: fontPlayfair,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) return { title: "Niet gevonden" };
  return {
    title: { default: org.name, template: `%s · ${org.name}` },
    description:
      org.heroSubtitle ?? `Verhuur online via ${org.name}. Powered by BookingBay.`,
  };
}

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) notFound();

  // Per-org accent — fall back to BookingBay coral.
  const accent = org.primaryColor ?? "#ef5934";
  // Eigen kleuren + lettertype per onderdeel. Leeg = standaard.
  const theme = safeParseSiteTheme(org.siteTheme);
  const siteFont = SITE_FONT_MAP[theme.font] ?? fontJakarta;
  const navPages = await getNavPages(org.id);
  const base = await getTenantBasePath(slug);

  return (
    <div
      className={`${siteFont.variable} flex min-h-svh flex-col font-sans antialiased`}
      style={{
        ["--tenant-accent" as string]: accent,
        ...(theme.pageBg ? { background: theme.pageBg } : {}),
      }}
    >
      <header
        className="border-b border-border bg-background/85 backdrop-blur"
        style={{
          ...(theme.headerBg ? { background: theme.headerBg } : {}),
          ...(theme.headerText ? { color: theme.headerText } : {}),
        }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href={tenantHref(base, "/")}
            className="flex items-center gap-2.5 font-semibold tracking-tight"
          >
            {org.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logoUrl} alt={org.name} className="h-9 w-auto" />
            ) : (
              <span
                className="grid h-9 w-9 place-items-center rounded-xl text-sm font-bold text-white shadow-sm"
                style={{ background: accent }}
              >
                {org.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="text-base">{org.name}</span>
          </Link>
          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 text-sm sm:flex">
            {navPages.map((p) => (
              <Link
                key={p.slug}
                href={tenantHref(base, `/${p.slug}`)}
                className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground"
                style={
                  theme.headerText
                    ? { color: theme.headerText, opacity: 0.85 }
                    : undefined
                }
              >
                {p.title}
              </Link>
            ))}
          </nav>

          {/* Mobile hamburger */}
          <TenantMobileNav
            accent={accent}
            items={[
              ...navPages.map((p) => ({
                href: tenantHref(base, `/${p.slug}`),
                label: p.title,
              })),
            ]}
          />
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer
        className="border-t border-border bg-muted/30 py-10"
        style={{
          ...(theme.footerBg ? { background: theme.footerBg } : {}),
          ...(theme.footerText ? { color: theme.footerText } : {}),
        }}
      >
        <div
          className="mx-auto max-w-6xl px-4 text-sm text-muted-foreground sm:px-6"
          style={theme.footerText ? { color: theme.footerText } : undefined}
        >
          <div className="grid gap-8 sm:grid-cols-3">
            {/* Bedrijf */}
            <div>
              <p
                className="font-semibold text-foreground"
                style={theme.footerText ? { color: theme.footerText } : undefined}
              >
                {org.name}
              </p>
              {(org.businessAddress || org.businessCity) && (
                <p className="mt-2 text-xs leading-relaxed">
                  {org.businessAddress}
                  {org.businessAddress && (org.businessPostcode || org.businessCity) && <br />}
                  {[org.businessPostcode, org.businessCity].filter(Boolean).join(" ")}
                </p>
              )}
              {(org.kvkNumber || org.vatNumber) && (
                <p className="mt-2 text-xs">
                  {[
                    org.kvkNumber ? `KvK ${org.kvkNumber}` : null,
                    org.vatNumber ? `BTW ${org.vatNumber}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>

            {/* Pagina's — Home en Contact staan er altijd, eigen pagina's ertussen */}
            <div>
                <p
                  className="text-xs font-semibold tracking-wider uppercase"
                  style={
                    theme.footerText
                      ? { color: theme.footerText, opacity: 0.7 }
                      : undefined
                  }
                >
                  Pagina&apos;s
                </p>
                <ul className="mt-2 flex flex-col gap-1.5 text-xs">
                  <li>
                    <Link
                      href={tenantHref(base, "/")}
                      className="hover:underline"
                      style={theme.footerText ? { color: theme.footerText } : undefined}
                    >
                      Home
                    </Link>
                  </li>
                  {navPages.map((p) => (
                    <li key={p.slug}>
                      <Link
                        href={tenantHref(base, `/${p.slug}`)}
                        className="hover:underline"
                        style={theme.footerText ? { color: theme.footerText } : undefined}
                      >
                        {p.title}
                      </Link>
                    </li>
                  ))}
                  {/* Geen hardcoded Contact-link: alleen échte pagina's van
                      de tenant staan hier (een eigen contact-pagina komt
                      vanzelf via navPages mee). */}
                </ul>
            </div>

            {/* Contact */}
            <div>
              <p
                className="text-xs font-semibold tracking-wider uppercase"
                style={
                  theme.footerText
                    ? { color: theme.footerText, opacity: 0.7 }
                    : undefined
                }
              >
                Contact
              </p>
              <ul className="mt-2 flex flex-col gap-1.5 text-xs">
                {org.contactEmail && (
                  <li>
                    <a
                      href={`mailto:${org.contactEmail}`}
                      className="hover:underline"
                      style={theme.footerText ? { color: theme.footerText } : undefined}
                    >
                      {org.contactEmail}
                    </a>
                  </li>
                )}
                {org.contactPhone && (
                  <li>
                    <a
                      href={`tel:${org.contactPhone.replace(/\s/g, "")}`}
                      className="hover:underline"
                      style={theme.footerText ? { color: theme.footerText } : undefined}
                    >
                      {org.contactPhone}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-start justify-between gap-2 border-t border-border/60 pt-4 text-xs sm:flex-row sm:items-center">
            <p>
              © {new Date().getFullYear()} {org.name}
            </p>
            {planLimits(org.plan).alwaysShowPoweredBy && (
              <p>
                Powered by{" "}
                <a
                  href={`http://${process.env.NEXTAUTH_URL?.replace(/^https?:\/\//, "") ?? "bookingbay.nl"}`}
                  className="text-foreground hover:underline"
                  style={theme.footerText ? { color: theme.footerText } : undefined}
                >
                  BookingBay
                </a>
              </p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
