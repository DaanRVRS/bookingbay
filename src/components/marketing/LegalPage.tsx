import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

interface Props {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalPage({ title, lastUpdated, children }: Props) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="border-b border-border pb-6">
            <p className="text-sm text-muted-foreground">Juridisch</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 text-xs text-muted-foreground">
              Laatst bijgewerkt: {lastUpdated}
            </p>
          </div>
          <article className="prose-legal mt-8">{children}</article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
