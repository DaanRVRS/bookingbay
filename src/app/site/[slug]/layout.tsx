import { notFound } from "next/navigation";
import Link from "next/link";
import { Geist } from "next/font/google";
import "../../globals.css";
import { getOrgBySlug } from "@/lib/tenants/queries";
import { getNavPages } from "@/lib/pages/queries";
import { planLimits } from "@/lib/plans";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

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
  const navPages = await getNavPages(org.id);

  return (
    <div
      className={`${geist.variable} flex min-h-svh flex-col font-sans antialiased`}
      style={{ ["--tenant-accent" as string]: accent }}
    >
      <header className="border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
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
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/"
              className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground"
            >
              Aanbod
            </Link>
            {navPages.map((p) => (
              <Link
                key={p.slug}
                href={`/${p.slug}`}
                className="hidden rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground sm:inline-block"
              >
                {p.title}
              </Link>
            ))}
            <Link
              href="/contact"
              className="rounded-md px-4 py-1.5 font-medium text-white shadow-sm transition-opacity hover:opacity-90"
              style={{ background: accent }}
            >
              Contact
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-muted/30 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:px-6">
          <div>
            <p className="font-medium text-foreground">{org.name}</p>
            <p className="mt-1 text-xs">
              {[org.contactEmail, org.contactPhone].filter(Boolean).join(" · ")}
            </p>
          </div>
          {planLimits(org.plan).alwaysShowPoweredBy && (
            <p className="text-xs">
              Powered by{" "}
              <a
                href={`http://${process.env.NEXTAUTH_URL?.replace(/^https?:\/\//, "") ?? "bookingbay.nl"}`}
                className="text-foreground hover:underline"
              >
                BookingBay
              </a>
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}
