import { MapPin } from "lucide-react";
import type { MapBlock } from "@/lib/pages/blocks";

const HEIGHT_CLASS: Record<MapBlock["height"], string> = {
  sm: "h-64",
  md: "h-96",
  lg: "h-[28rem]",
};

export function MapBlockView({ block }: { block: MapBlock }) {
  return (
    <section className="border-b border-border py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {(block.heading || block.address) && (
          <div className="mb-5 flex items-start gap-3">
            <MapPin className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div>
              {block.heading && (
                <h2 className="text-2xl font-semibold tracking-tight">
                  {block.heading}
                </h2>
              )}
              {block.address && (
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">
                  {block.address}
                </p>
              )}
            </div>
          </div>
        )}
        {block.embedUrl ? (
          <div
            className={`overflow-hidden rounded-2xl border border-border bg-muted ${HEIGHT_CLASS[block.height]}`}
          >
            <iframe
              src={block.embedUrl}
              title={block.heading || "Kaart"}
              className="size-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        ) : (
          <div
            className={`grid place-items-center rounded-2xl border border-dashed border-border bg-card/40 text-center ${HEIGHT_CLASS[block.height]}`}
          >
            <p className="text-sm text-muted-foreground">
              Plak een Google Maps embed-URL in de instellingen om de kaart te
              tonen.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
