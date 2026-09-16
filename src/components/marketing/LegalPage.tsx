import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

interface Props {
  title: string;
  lastUpdated: string;
  /** Optionele knoppen rechts van de titel (bv. afdrukken/PDF). */
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function LegalPage({ title, lastUpdated, actions, children }: Props) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="print-hidden">
        <SiteHeader />
      </div>
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20 print:py-6">
          <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Juridisch</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-2 text-xs text-muted-foreground">
                Laatst bijgewerkt: {lastUpdated}
              </p>
            </div>
            {actions && <div className="shrink-0">{actions}</div>}
          </div>
          <article className="prose-legal mt-8">{children}</article>
        </div>
      </main>
      <div className="print-hidden">
        <SiteFooter />
      </div>
    </div>
  );
}

const BODY_CLASS =
  "mt-3 flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground [&_strong]:text-foreground [&_a]:text-foreground [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul>li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol>li]:my-1";

export function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-8 scroll-mt-24 first:mt-0">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className={BODY_CLASS}>{children}</div>
    </section>
  );
}

export function HighlightSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="mt-8 scroll-mt-24 rounded-2xl border border-border bg-accent/30 p-6 print:border-0 print:p-0"
    >
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className={BODY_CLASS}>{children}</div>
    </section>
  );
}

/**
 * Compacte tabel voor juridische overzichten (doel → grondslag → gegevens,
 * subverwerkers, cookies). Scrollt horizontaal op smalle schermen.
 */
export function LegalTable({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border">
            {head.map((h) => (
              <th
                key={h}
                scope="col"
                className="py-2 pr-3 align-bottom font-semibold text-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className="border-b border-border/60 align-top">
              {cells.map((c, j) => (
                <td key={j} className="py-2 pr-3">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
