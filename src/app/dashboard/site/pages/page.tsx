import Link from "next/link";
import { ArrowLeft, Lock, Plus } from "lucide-react";
import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { planAllows, planLimits } from "@/lib/plans";
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

  const limits = planLimits(org.plan);
  const builderEnabled = planAllows(org.plan, "pageBuilder");
  // Make sure every Pro+ org has a home-page record so it shows up in the
  // list and can be edited like any other page.
  if (builderEnabled) {
    await ensureHomePage(ctx.organization.id);
  }
  const pages = builderEnabled ? await listPagesForOrg(ctx.organization.id) : [];
  // Home page does not count against the page quota.
  const customPagesCount = pages.filter((p) => p.slug !== "home").length;
  const atLimit = customPagesCount >= limits.maxPages;

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="Pagina's"
          description="Bouw extra pagina's voor je klantsite met de drag-and-drop editor."
          back={{ href: "/dashboard/site", label: "Terug naar klantsite" }}
          action={
            builderEnabled ? (
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
            ) : undefined
          }
        />

        {!builderEnabled ? (
          <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
              <Lock className="size-5" />
            </span>
            <h2 className="text-lg font-semibold">Page-builder beschikbaar vanaf Professional</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Op het Starter-plan kun je je homepagina aanpassen via de standaard customizer. Upgrade om
              extra pagina&apos;s met eigen blokken te bouwen.
            </p>
            <Link
              href="/dashboard/settings/billing"
              className="mt-2 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Upgrade-opties bekijken
            </Link>
            <Link
              href="/dashboard/site"
              className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3" /> Terug naar klantsite
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-4 text-xs text-muted-foreground">
              {customPagesCount} van{" "}
              {Number.isFinite(limits.maxPages) ? limits.maxPages : "onbeperkt"}
              {" "}extra pagina&apos;s gebruikt (home telt niet mee).
            </p>
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
          </>
        )}
      </div>
    </div>
  );
}
