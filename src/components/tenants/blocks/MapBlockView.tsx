import { MapPin } from "lucide-react";
import type { MapBlock } from "@/lib/pages/blocks";
import { ConsentEmbed } from "./ConsentEmbed";

const HEIGHT_CLASS: Record<MapBlock["height"], string> = {
  sm: "h-64",
  md: "h-96",
  lg: "h-[28rem]",
};

export function MapBlockView({ block }: { block: MapBlock }) {
  // Adres → directe Google Maps embed (geen API-key nodig). Een eigen
  // embed-URL blijft werken voor wie er al een ingevuld had. De kaart wordt
  // pas geladen nadat de bezoeker daarop klikt (ConsentEmbed) — tot dan
  // gaat er niets naar Google.
  const address = block.address?.trim() ?? "";
  const src = address
    ? `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
    : block.embedUrl?.trim() || null;
  const directionsHref = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null;

  return (
    <section className="border-b border-border py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {(block.heading || address) && (
          <div className="mb-5 flex items-start gap-3">
            <MapPin className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div>
              {block.heading && (
                <h2 className="text-2xl font-semibold tracking-tight">
                  {block.heading}
                </h2>
              )}
              {address && (
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">
                  {address}
                </p>
              )}
            </div>
          </div>
        )}
        {src ? (
          <ConsentEmbed
            src={src}
            title={block.heading || "Kaart"}
            provider="Google Maps"
            className={`relative overflow-hidden rounded-2xl border border-border bg-muted ${HEIGHT_CLASS[block.height]}`}
            iframeClassName="absolute inset-0 size-full"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            loadLabel="Kaart laden"
            placeholder={address || undefined}
            externalHref={directionsHref}
            externalLabel="Open in Google Maps"
          />
        ) : (
          <div
            className={`grid place-items-center rounded-2xl border border-dashed border-border bg-card/40 text-center ${HEIGHT_CLASS[block.height]}`}
          >
            <p className="text-sm text-muted-foreground">
              Vul een adres of plaats in de instellingen in om de kaart te
              tonen.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
