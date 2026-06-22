import type { CSSProperties } from "react";
import { SmartBookingWidget } from "@/components/booking-widget/SmartBookingWidget";
import { themeStyle } from "@/lib/widget/theme";
import type { BookingWidgetBlock } from "@/lib/pages/blocks";
import type { InlineWidgetData } from "@/lib/tenants/inline-widget";

/**
 * "Boek-widget"-blok: rendert de volledige SmartBookingWidget midden op een
 * tenant-pagina. De data wordt server-side door de PageRenderer geladen
 * (getInlineWidgetData). Geen boekbare items → data is null → niets renderen.
 */
export function BookingWidgetBlockView({
  block,
  data,
}: {
  block: BookingWidgetBlock;
  data: InlineWidgetData | null;
}) {
  if (!data) return null;
  return (
    <section className="px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        {block.heading ? (
          <h2 className="mb-6 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            {block.heading}
          </h2>
        ) : null}
        <div style={themeStyle(data.theme) as CSSProperties}>
          <SmartBookingWidget
            slug={data.slug}
            orgName={data.orgName}
            logoUrl={data.logoUrl}
            accent={data.accent}
            categories={data.categories}
            addons={data.addons}
            usps={data.usps}
            tagline={data.tagline}
            defaultLocale={data.defaultLocale}
          />
        </div>
      </div>
    </section>
  );
}
