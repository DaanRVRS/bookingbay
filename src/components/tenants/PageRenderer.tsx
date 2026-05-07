import type { Block } from "@/lib/pages/blocks";
import { HeroBlockView } from "./blocks/HeroBlockView";
import { TextBlockView } from "./blocks/TextBlockView";
import { CtaBlockView } from "./blocks/CtaBlockView";
import { SpacerBlockView } from "./blocks/SpacerBlockView";
import { ImageStripBlockView } from "./blocks/ImageStripBlockView";
import { IconRowBlockView } from "./blocks/IconRowBlockView";
import { SliderBlockView } from "./blocks/SliderBlockView";
import { GalleryBlockView } from "./blocks/GalleryBlockView";
import { FaqBlockView } from "./blocks/FaqBlockView";
import { VideoBlockView } from "./blocks/VideoBlockView";
import { PriceTableBlockView } from "./blocks/PriceTableBlockView";
import { TestimonialsBlockView } from "./blocks/TestimonialsBlockView";
import { OpeningHoursBlockView } from "./blocks/OpeningHoursBlockView";
import { MapBlockView } from "./blocks/MapBlockView";

export function PageRenderer({
  blocks,
  organizationId,
  accent,
}: {
  blocks: Block[];
  organizationId: string;
  accent: string;
}) {
  return (
    <>
      {blocks.map((block) => {
        switch (block.type) {
          case "hero":
            return <HeroBlockView key={block.id} block={block} accent={accent} />;
          case "text":
            return <TextBlockView key={block.id} block={block} />;
          case "cta":
            return <CtaBlockView key={block.id} block={block} accent={accent} />;
          case "spacer":
            return <SpacerBlockView key={block.id} block={block} />;
          case "imageStrip":
            return <ImageStripBlockView key={block.id} block={block} />;
          case "iconRow":
            return <IconRowBlockView key={block.id} block={block} accent={accent} />;
          case "slider":
            return (
              <SliderBlockView
                key={block.id}
                block={block}
                organizationId={organizationId}
                accent={accent}
              />
            );
          case "gallery":
            return <GalleryBlockView key={block.id} block={block} />;
          case "faq":
            return <FaqBlockView key={block.id} block={block} accent={accent} />;
          case "video":
            return <VideoBlockView key={block.id} block={block} />;
          case "priceTable":
            return <PriceTableBlockView key={block.id} block={block} accent={accent} />;
          case "testimonials":
            return <TestimonialsBlockView key={block.id} block={block} accent={accent} />;
          case "openingHours":
            return <OpeningHoursBlockView key={block.id} block={block} accent={accent} />;
          case "map":
            return <MapBlockView key={block.id} block={block} />;
        }
      })}
    </>
  );
}
