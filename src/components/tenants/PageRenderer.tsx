import type { Block } from "@/lib/pages/blocks";
import { HeroBlockView } from "./blocks/HeroBlockView";
import { TextBlockView } from "./blocks/TextBlockView";
import { CtaBlockView } from "./blocks/CtaBlockView";
import { SpacerBlockView } from "./blocks/SpacerBlockView";
import { ImageStripBlockView } from "./blocks/ImageStripBlockView";
import { IconRowBlockView } from "./blocks/IconRowBlockView";
import { SliderBlockView } from "./blocks/SliderBlockView";

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
        }
      })}
    </>
  );
}
