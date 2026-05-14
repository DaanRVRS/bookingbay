import Link from "next/link";
import { Puzzle } from "lucide-react";
import type { OrgIntegrationStatus } from "@prisma/client";
import { requireOrg } from "@/lib/auth/session";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { IntegrationCatalog } from "@/components/integrations/IntegrationCatalog";
import { IntegrationLogo } from "@/components/integrations/IntegrationLogo";
import { IntegrationStatusBadge } from "@/components/integrations/IntegrationStatusBadge";
import {
  getOrgIntegrationsMap,
  sumActiveMonthlyUpsell,
} from "@/lib/integrations/queries";
import { INTEGRATIONS, getIntegration } from "@/lib/integrations/catalog";

export const metadata = { title: "Koppelingen" };

export default async function IntegrationsPage() {
  const ctx = await requireOrg();
  const [orgMap, monthlyUpsell] = await Promise.all([
    getOrgIntegrationsMap(ctx.organization.id),
    sumActiveMonthlyUpsell(ctx.organization.id),
  ]);

  const statusByKey: Record<string, OrgIntegrationStatus> = {};
  for (const [k, v] of orgMap) statusByKey[k] = v.status;

  type OrgRow = NonNullable<ReturnType<typeof orgMap.get>>;
  type Pair = { row: OrgRow; def: NonNullable<ReturnType<typeof getIntegration>> };

  const allRows: OrgRow[] = [...orgMap.values()];
  const pair = (r: OrgRow): Pair | null => {
    const def = getIntegration(r.integrationKey);
    return def ? { row: r, def } : null;
  };
  const activeRows: Pair[] = allRows
    .filter((r) => r.status === "ACTIVE" || r.status === "PAUSED" || r.status === "FAILED")
    .map(pair)
    .filter((x): x is Pair => x !== null);
  const pendingRows: Pair[] = allRows
    .filter((r) => r.status === "INTERESTED" || r.status === "REQUESTED")
    .map(pair)
    .filter((x): x is Pair => x !== null);

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          title="Koppelingen"
          description="Verbind BookingBay met de tools die je al gebruikt. Sommige koppelingen zijn gratis, anderen kosten een vast bedrag per maand bovenop je abonnement."
        />

        {/* Snelle samenvatting van wat al loopt + maandelijkse upsell-kosten. */}
        {(activeRows.length > 0 || pendingRows.length > 0) && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {activeRows.length > 0 && (
              <section className="rounded-xl border border-border bg-card p-5">
                <header className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Actieve koppelingen</h2>
                  <p className="text-xs text-muted-foreground">
                    +€{monthlyUpsell}/maand
                  </p>
                </header>
                <ul className="mt-3 flex flex-col gap-2">
                  {activeRows.map(({ row, def }) => (
                    <li key={row.id}>
                      <Link
                        href={`/dashboard/integrations/${def.slug}`}
                        className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/50 px-3 py-2 transition-colors hover:border-primary/40"
                      >
                        <IntegrationLogo integration={def} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{def.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {row.lastSyncAt
                              ? `Laatst gesynchroniseerd op ${row.lastSyncAt.toLocaleDateString("nl-NL")}`
                              : "Nog geen sync uitgevoerd"}
                          </p>
                        </div>
                        <IntegrationStatusBadge
                          catalogStatus={def.status}
                          orgStatus={row.status}
                          size="sm"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {pendingRows.length > 0 && (
              <section className="rounded-xl border border-border bg-card p-5">
                <header className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Openstaande verzoeken</h2>
                  <span className="grid size-5 place-items-center rounded-full bg-primary/12 text-[10px] font-semibold text-primary">
                    {pendingRows.length}
                  </span>
                </header>
                <ul className="mt-3 flex flex-col gap-2">
                  {pendingRows.map(({ row, def }) => (
                    <li key={row.id}>
                      <Link
                        href={`/dashboard/integrations/${def.slug}`}
                        className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/50 px-3 py-2 transition-colors hover:border-primary/40"
                      >
                        <IntegrationLogo integration={def} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{def.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {row.status === "INTERESTED"
                              ? "We laten weten zodra deze koppeling live gaat."
                              : "Ons team activeert deze binnen één werkdag."}
                          </p>
                        </div>
                        <IntegrationStatusBadge
                          catalogStatus={def.status}
                          orgStatus={row.status}
                          size="sm"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {activeRows.length === 0 && pendingRows.length === 0 && (
          <div className="mt-6 flex items-center gap-4 rounded-xl border border-dashed border-border bg-card/40 px-5 py-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Puzzle className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Nog geen koppelingen actief</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Begin met een gratis agenda-sync, of activeer Mollie om
                klanten direct bij het boeken te laten betalen.
              </p>
            </div>
          </div>
        )}

        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-base font-semibold tracking-tight">Catalogus</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {INTEGRATIONS.length} koppelingen — kies een categorie of zoek op naam.
            </p>
          </div>
          <IntegrationCatalog
            orgStatusByKey={statusByKey}
            detailHrefTemplate="/dashboard/integrations/{slug}"
          />
        </section>
      </div>
    </div>
  );
}
