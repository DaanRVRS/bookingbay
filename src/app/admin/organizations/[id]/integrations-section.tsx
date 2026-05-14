import Link from "next/link";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { db } from "@/lib/db";
import { getIntegration } from "@/lib/integrations/catalog";
import { IntegrationLogo } from "@/components/integrations/IntegrationLogo";
import { IntegrationStatusBadge } from "@/components/integrations/IntegrationStatusBadge";
import { AdminIntegrationControls } from "./integration-controls";

/**
 * Server-rendered sectie op de admin-org-pagina. Toont alle koppelingen
 * waar deze org iets mee heeft (verzoek, interesse, actief) + per-rij
 * controls om status / prijs aan te passen.
 */
export async function IntegrationsSection({ organizationId }: { organizationId: string }) {
  const rows = await db.orgIntegration.findMany({
    where: { organizationId },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });

  if (rows.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <header className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Koppelingen</h2>
          <span className="text-[11px] text-muted-foreground">
            Geen verzoeken — klant heeft niets gevraagd of geactiveerd.
          </span>
        </header>
      </section>
    );
  }

  const totalMonthly = rows
    .filter((r) => r.status === "ACTIVE")
    .reduce((sum, r) => sum + r.monthlyPriceEuro, 0);

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Koppelingen</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {rows.length} record{rows.length === 1 ? "" : "s"} ·{" "}
            <strong className="text-foreground">€{totalMonthly}/mnd</strong> actieve upsell
          </p>
        </div>
      </header>

      <ul className="mt-5 divide-y divide-border">
        {rows.map((row) => {
          const def = getIntegration(row.integrationKey);
          if (!def) {
            return (
              <li key={row.id} className="py-3 text-xs text-muted-foreground">
                Onbekende koppeling: <code>{row.integrationKey}</code>
              </li>
            );
          }
          return (
            <li key={row.id} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-start">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <IntegrationLogo integration={def} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {def.name}
                    <IntegrationStatusBadge
                      catalogStatus={def.status}
                      orgStatus={row.status}
                      size="sm"
                    />
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    €{row.monthlyPriceEuro}/mnd
                    {row.activatedAt && (
                      <>
                        {" · "}
                        Actief sinds{" "}
                        {format(row.activatedAt, "d MMM yyyy", { locale: nl })}
                      </>
                    )}
                    {row.pausedAt && row.status === "PAUSED" && (
                      <>
                        {" · "}
                        Gepauzeerd op{" "}
                        {format(row.pausedAt, "d MMM yyyy", { locale: nl })}
                      </>
                    )}
                    {row.failureReason && (
                      <>
                        {" · "}
                        <span className="text-destructive">
                          {row.failureReason}
                        </span>
                      </>
                    )}
                  </p>
                  {row.notes && (
                    <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                      {row.notes}
                    </p>
                  )}
                  {row.supportTicketId && (
                    <Link
                      href={`/admin/support/${row.supportTicketId}`}
                      className="mt-1 inline-block text-[11px] text-primary hover:underline"
                    >
                      Open support-ticket →
                    </Link>
                  )}
                </div>
              </div>
              <div className="shrink-0">
                <AdminIntegrationControls
                  organizationId={organizationId}
                  slug={def.slug}
                  initialStatus={row.status}
                  initialMonthlyPriceEuro={row.monthlyPriceEuro}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
