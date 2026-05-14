import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { CopyBlock, LinkBlock } from "./widget-snippets";

export const metadata = { title: "Widgets" };

export default async function WidgetsPage() {
  const ctx = await requireOrg();
  const org = await db.organization.findUnique({
    where: { id: ctx.organization.id },
    select: { id: true, name: true, slug: true },
  });
  if (!org) throw new Error("Organization not found");

  const protocol = env.APP_URL.startsWith("https") ? "https" : "http";
  const tenantBase = `${protocol}://${env.TENANT_DOMAIN}`;
  const appBase = env.APP_URL.replace(/\/$/, "");

  const items = await db.item.findMany({
    where: { organizationId: org.id, isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      category: { select: { name: true } },
    },
  });

  const scriptTag = `<script src="${tenantBase}/embed.js" defer></script>`;
  const generalBookSnippet =
    `<div data-bookingbay-book="${org.slug}"></div>\n${scriptTag}`;
  const catalogSnippet =
    `<div data-bookingbay="${org.slug}"></div>\n${scriptTag}`;
  const generalBookUrl = `${appBase}/book/${org.slug}`;

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title="Widgets &amp; deelbare links"
          description="Plak deze widgets op je eigen website, of deel een directe boek-link via WhatsApp, e-mail of social media."
        />

        {/* Algemene boek-widget */}
        <section className="mt-6 rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold">Boek-widget — algemeen</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Klanten kiezen zelf een item uit je catalogus en boeken in één formulier.
            Resultaat: directe boeking met status &quot;In afwachting&quot; in jouw planning.
          </p>

          <div className="mt-4 space-y-3">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Embed-code
              </p>
              <CopyBlock label="HTML" language="HTML" value={generalBookSnippet} />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Direct te delen link
              </p>
              <LinkBlock url={generalBookUrl} />
            </div>
          </div>
        </section>

        {/* Per-item snippets */}
        <section className="mt-6 rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold">Boek-widget — per item</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Embed het boek-formulier voor één specifiek item — handig op de productpagina van je
            eigen site, naast prijs en omschrijving.
          </p>

          {items.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-border bg-card/40 px-6 py-8 text-center text-sm text-muted-foreground">
              Voeg eerst items toe in je catalogus om per-item widgets te krijgen.
            </div>
          ) : (
            <ul className="mt-4 space-y-4">
              {items.map((item) => {
                const snippet = `<div data-bookingbay-item="${item.id}" data-bookingbay-slug="${org.slug}"></div>\n${scriptTag}`;
                const directLink = `${appBase}/book/${org.slug}/${item.id}`;
                return (
                  <li
                    key={item.id}
                    className="rounded-lg border border-border bg-background p-4"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.category.name}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      <CopyBlock label="HTML" language="HTML" value={snippet} />
                      <LinkBlock url={directLink} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Catalog widget (existing) */}
        <section className="mt-6 rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold">Catalogus-widget</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Toont je hele aanbod (zoeken + categorieën + items). Bezoekers klikken op een item om
            te boeken.
          </p>
          <div className="mt-4">
            <CopyBlock label="HTML" language="HTML" value={catalogSnippet} />
          </div>
        </section>

        <details className="mt-6 rounded-md text-xs">
          <summary className="cursor-pointer px-1 py-1 font-medium text-muted-foreground hover:text-foreground">
            Hoe gebruik ik deze codes?
          </summary>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-muted-foreground">
            <li>Kopieer de HTML van de widget die je wilt gebruiken.</li>
            <li>
              Plak 'm op de pagina van je eigen website (WordPress, Wix, Squarespace,
              eigen HTML — werkt overal).
            </li>
            <li>
              De widget past zich aan jouw kleur + logo aan, groeit mee met de inhoud, en stuurt
              boekingen direct naar je BookingBay-planning met status &quot;In afwachting&quot;.
            </li>
            <li>
              Liever geen widget? Deel de directe boek-link via WhatsApp, e-mail of in je
              Instagram-bio.
            </li>
          </ol>
        </details>
      </div>
    </div>
  );
}
