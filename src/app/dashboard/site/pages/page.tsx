import Link from "next/link";
import { Plus } from "lucide-react";
import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { planLimits } from "@/lib/plans";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ensureHomePage, listPagesForOrg } from "@/lib/pages/queries";
import { PagesList } from "./pages-list";
import { NewPageDialog } from "./new-page-dialog";

export const metadata = { title: "Pagina's" };

export default async function SitePagesPage() {
  const ctx = await requireOrg();
  const org = await db.organization.findUnique({
    where: { id: ctx.organization.id },
    select: { plan: true, slug: true },
  });
  if (!org) throw new Error("Organization not found");

  // Elk plan heeft de builder — Starter alleen voor de homepagina
  // (maxPages 0 = geen extra pagina's naast home).
  const limits = planLimits(org.plan);
  // Make sure every org has a home-page record so it shows up in the
  // list and can be edited like any other page.
  await ensureHomePage(ctx.organization.id);
  const pages = await listPagesForOrg(ctx.organization.id);
  // Home page does not count against the page quota.
  const customPagesCount = pages.filter((p) => p.slug !== "home").length;
  const atLimit = customPagesCount >= limits.maxPages;
  const homeOnlyPlan = limits.maxPages === 0;

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="Pagina's"
          description={
            homeOnlyPlan
              ? "Bewerk je homepagina met de drag-and-drop editor."
              : "Bouw extra pagina's voor je klantsite met de drag-and-drop editor."
          }
          back={{ href: "/dashboard/site", label: "Terug naar klantsite" }}
          action={
            homeOnlyPlan ? undefined : (
              <NewPageDialog
                disabled={atLimit}
                trigger={
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={atLimit}
                  >
                    <Plus className="size-4" /> Nieuwe pagina
                  </button>
                }
              />
            )
          }
        />

        {homeOnlyPlan ? (
          <p className="mt-4 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Op het <span className="font-semibold text-foreground">{limits.label}</span>-plan heb
            je één pagina: je homepagina. Die kun je hieronder volledig bewerken, maar niet
            verwijderen.{" "}
            <Link
              href="/dashboard/settings/billing"
              className="font-medium text-primary hover:underline"
            >
              Upgrade
            </Link>{" "}
            om extra pagina&apos;s toe te voegen.
          </p>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">
            {customPagesCount} van{" "}
            {Number.isFinite(limits.maxPages) ? limits.maxPages : "onbeperkt"}
            {" "}extra pagina&apos;s gebruikt (je homepagina telt niet mee).
          </p>
        )}
        <div className="mt-4">
          <PagesList
            tenantSlug={org.slug}
            pages={pages.map((p) => ({
              id: p.id,
              title: p.title,
              slug: p.slug,
              isPublished: p.isPublished,
              showInNav: p.showInNav,
              blockCount: p.blocks.length,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
