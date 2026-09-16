import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { COMPANY } from "@/lib/company";
import { PrintButton } from "@/components/ui/PrintButton";
import type {
  InvoiceCustomerSnapshot,
  InvoiceSellerSnapshot,
} from "@/lib/billing/invoices";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const inv = await db.invoice.findUnique({ where: { id }, select: { number: true } });
  return {
    title: inv ? `Factuur ${inv.number}` : "Factuur",
    robots: { index: false, follow: false },
  };
}

function euro(cents: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
}

const METHOD_LABELS: Record<string, string> = {
  ideal: "iDEAL",
  directdebit: "SEPA-incasso",
  creditcard: "Kaart",
  bancontact: "Bancontact",
  paypal: "PayPal",
};

/**
 * Printbare factuur, buiten de dashboard-chrome zodat "Opslaan als PDF"
 * alleen de factuur oplevert. Alleen voor eigenaren en beheerders van de
 * organisatie waar de factuur bij hoort.
 */
export default async function InvoicePage({ params }: PageProps) {
  const { id } = await params;
  const ctx = await requireOrg();
  if (ctx.membership.role !== "OWNER" && ctx.membership.role !== "ADMIN") notFound();

  const invoice = await db.invoice.findFirst({
    where: { id, organizationId: ctx.organization.id },
  });
  if (!invoice) notFound();

  const seller = invoice.seller as unknown as InvoiceSellerSnapshot;
  const customer = invoice.customer as unknown as InvoiceCustomerSnapshot;
  const method = invoice.paymentMethod
    ? (METHOD_LABELS[invoice.paymentMethod] ?? invoice.paymentMethod)
    : null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 print:px-0 print:py-0">
      <div className="print-hidden mb-6 flex items-center justify-between gap-3">
        <Link
          href="/dashboard/settings/billing"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Terug naar Plan &amp; facturatie
        </Link>
        <PrintButton />
      </div>

      <article className="rounded-2xl border border-border bg-card p-8 print:rounded-none print:border-0 print:p-0">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Factuur
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{invoice.number}</h1>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Factuurdatum</dt>
              <dd>{format(invoice.issuedAt, "d MMMM yyyy", { locale: nl })}</dd>
              <dt className="text-muted-foreground">Periode</dt>
              <dd>
                {format(invoice.periodStart, "d MMM yyyy", { locale: nl })} –{" "}
                {format(invoice.periodEnd, "d MMM yyyy", { locale: nl })}
              </dd>
              <dt className="text-muted-foreground">Betaalkenmerk</dt>
              <dd className="font-mono text-xs">{invoice.paymentId}</dd>
            </dl>
          </div>
          <div className="text-sm sm:text-right">
            <p className="font-semibold">{seller.name}</p>
            <p>{seller.address}</p>
            <p>
              {seller.postalCode} {seller.city}
            </p>
            <p>{seller.country}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              KvK {seller.kvk} · btw {seller.vat}
              <br />
              {seller.email}
            </p>
          </div>
        </header>

        <section className="mt-8 rounded-lg border border-border bg-background/60 p-4 text-sm">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Factuur aan
          </p>
          <p className="mt-1 font-semibold">{customer.companyName}</p>
          {customer.address && <p>{customer.address}</p>}
          {(customer.postalCode || customer.city) && (
            <p>
              {customer.postalCode} {customer.city}
            </p>
          )}
          {customer.country && customer.country !== "NL" && <p>{customer.country}</p>}
          {customer.vatNumber && (
            <p className="mt-1 text-xs text-muted-foreground">Btw-nummer: {customer.vatNumber}</p>
          )}
          {customer.email && (
            <p className="text-xs text-muted-foreground">{customer.email}</p>
          )}
        </section>

        <table className="mt-8 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
              <th className="py-2 pr-3 font-semibold">Omschrijving</th>
              <th className="py-2 pl-3 text-right font-semibold">Bedrag</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/60">
              <td className="py-3 pr-3">
                {invoice.description}
                <span className="block text-xs text-muted-foreground">
                  {format(invoice.periodStart, "d MMM yyyy", { locale: nl })} t/m{" "}
                  {format(invoice.periodEnd, "d MMM yyyy", { locale: nl })}
                </span>
              </td>
              <td className="py-3 pl-3 text-right tabular-nums">{euro(invoice.netCents)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td className="py-1.5 pr-3 text-right text-muted-foreground">Subtotaal excl. btw</td>
              <td className="py-1.5 pl-3 text-right tabular-nums">{euro(invoice.netCents)}</td>
            </tr>
            <tr>
              <td className="py-1.5 pr-3 text-right text-muted-foreground">
                Btw {invoice.vatRate}%
              </td>
              <td className="py-1.5 pl-3 text-right tabular-nums">{euro(invoice.vatCents)}</td>
            </tr>
            <tr className="border-t border-border">
              <td className="py-2 pr-3 text-right font-semibold">Totaal incl. btw</td>
              <td className="py-2 pl-3 text-right text-base font-semibold tabular-nums">
                {euro(invoice.grossCents)}
              </td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-8 text-sm">
          <strong>Betaald</strong> op {format(invoice.issuedAt, "d MMMM yyyy", { locale: nl })}
          {method ? ` via ${method}` : ""} (Mollie). Er hoeft niets meer te worden overgemaakt.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Vragen over deze factuur? Mail {COMPANY.email} onder vermelding van het
          factuurnummer.
        </p>
      </article>
    </main>
  );
}
