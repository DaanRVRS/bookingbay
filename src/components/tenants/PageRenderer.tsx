import type {
  Block,
  NonContainerBlock,
  PriceTableBlock,
  TestimonialsBlock,
} from "@/lib/pages/blocks";
import { getPublishedReviews, getReviewsByIds } from "@/lib/reviews/queries";
import { getPriceListItems } from "@/lib/tenants/queries";
import {
  getInlineWidgetData,
  type InlineWidgetData,
} from "@/lib/tenants/inline-widget";
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
import {
  PriceTableBlockView,
  type PriceTableItem,
} from "./blocks/PriceTableBlockView";
import {
  TestimonialsBlockView,
  type TestimonialItem,
} from "./blocks/TestimonialsBlockView";
import { OpeningHoursBlockView } from "./blocks/OpeningHoursBlockView";
import { MapBlockView } from "./blocks/MapBlockView";
import { ButtonBlockView } from "./blocks/ButtonBlockView";
import { QuoteBlockView } from "./blocks/QuoteBlockView";
import { ImageSliderBlockView } from "./blocks/ImageSliderBlockView";
import { ContainerBlockView } from "./blocks/ContainerBlockView";
import { BookingWidgetBlockView } from "./blocks/BookingWidgetBlockView";
import { ContactBlockView } from "./blocks/ContactBlockView";

async function resolveTestimonialItems(
  block: TestimonialsBlock,
  organizationId: string,
): Promise<TestimonialItem[]> {
  if (block.source === "auto") {
    const reviews = await getPublishedReviews(organizationId);
    return reviews.slice(0, block.limit).map((r) => ({
      quote: r.quote,
      author: r.author,
      role: r.role,
      rating: r.rating,
    }));
  }
  if (block.source === "manual" && block.reviewIds.length > 0) {
    const reviews = await getReviewsByIds(organizationId, block.reviewIds);
    return reviews.map((r) => ({
      quote: r.quote,
      author: r.author,
      role: r.role,
      rating: r.rating,
    }));
  }
  return block.items.map((it) => ({
    quote: it.quote,
    author: it.author,
    role: it.role || null,
    rating: it.rating,
  }));
}

function collectTestimonialBlocks(blocks: Block[]): TestimonialsBlock[] {
  const out: TestimonialsBlock[] = [];
  for (const b of blocks) {
    if (b.type === "testimonials") out.push(b);
    if (b.type === "container") {
      for (const c of b.children) {
        if (c.type === "testimonials") out.push(c);
      }
    }
  }
  return out;
}

function collectPriceTableBlocks(blocks: Block[]): PriceTableBlock[] {
  const out: PriceTableBlock[] = [];
  for (const b of blocks) {
    if (b.type === "priceTable") out.push(b);
    if (b.type === "container") {
      for (const c of b.children) {
        if (c.type === "priceTable") out.push(c);
      }
    }
  }
  return out;
}

async function resolvePriceTableItems(
  block: PriceTableBlock,
  organizationId: string,
): Promise<PriceTableItem[]> {
  const opts =
    block.source === "items"
      ? { itemIds: block.itemIds }
      : { categoryId: block.categoryId };
  return getPriceListItems(organizationId, opts);
}

function renderNonContainer(
  block: NonContainerBlock,
  ctx: {
    organizationId: string;
    accent: string;
    testimonialItemsByBlockId: Map<string, TestimonialItem[]>;
    priceTableItemsByBlockId: Map<string, PriceTableItem[]>;
    contactBasePath: string;
    widgetData: InlineWidgetData | null;
  },
) {
  const {
    organizationId,
    accent,
    testimonialItemsByBlockId,
    priceTableItemsByBlockId,
    contactBasePath,
    widgetData,
  } = ctx;
  switch (block.type) {
    case "hero":
      return <HeroBlockView block={block} accent={accent} />;
    case "text":
      return <TextBlockView block={block} />;
    case "cta":
      return <CtaBlockView block={block} accent={accent} />;
    case "spacer":
      return <SpacerBlockView block={block} />;
    case "imageStrip":
      return <ImageStripBlockView block={block} />;
    case "iconRow":
      return <IconRowBlockView block={block} accent={accent} />;
    case "slider":
      return (
        <SliderBlockView
          block={block}
          organizationId={organizationId}
          accent={accent}
        />
      );
    case "gallery":
      return <GalleryBlockView block={block} />;
    case "faq":
      return <FaqBlockView block={block} accent={accent} />;
    case "video":
      return <VideoBlockView block={block} />;
    case "priceTable":
      return (
        <PriceTableBlockView
          block={block}
          accent={accent}
          resolvedItems={priceTableItemsByBlockId.get(block.id) ?? []}
          contactBasePath={contactBasePath}
        />
      );
    case "testimonials":
      return (
        <TestimonialsBlockView
          block={block}
          accent={accent}
          resolvedItems={testimonialItemsByBlockId.get(block.id) ?? []}
        />
      );
    case "openingHours":
      return <OpeningHoursBlockView block={block} accent={accent} />;
    case "map":
      return <MapBlockView block={block} />;
    case "button":
      return <ButtonBlockView block={block} accent={accent} />;
    case "quote":
      return <QuoteBlockView block={block} accent={accent} />;
    case "imageSlider":
      return <ImageSliderBlockView block={block} />;
    case "bookingWidget":
      return <BookingWidgetBlockView block={block} data={widgetData} />;
    case "contact":
      return (
        <ContactBlockView
          block={block}
          organizationId={organizationId}
          accent={accent}
        />
      );
  }
}

export async function PageRenderer({
  blocks,
  organizationId,
  accent,
  contactBasePath = "",
}: {
  blocks: Block[];
  organizationId: string;
  accent: string;
  /**
   * Tenant base path so that internal CTAs in resolved blocks (e.g. the
   * priceTable "Reserveer" button) link correctly under both subdomain and
   * /site/<slug> path-style access.
   */
  contactBasePath?: string;
}) {
  // Pre-resolve all dynamic blocks (testimonials + price tables) so the
  // rendered output stays synchronous from here down.
  const testimonialItemsByBlockId = new Map<string, TestimonialItem[]>();
  const priceTableItemsByBlockId = new Map<string, PriceTableItem[]>();

  await Promise.all([
    ...collectTestimonialBlocks(blocks).map(async (b) => {
      const items = await resolveTestimonialItems(b, organizationId);
      testimonialItemsByBlockId.set(b.id, items);
    }),
    ...collectPriceTableBlocks(blocks).map(async (b) => {
      const items = await resolvePriceTableItems(b, organizationId);
      priceTableItemsByBlockId.set(b.id, items);
    }),
  ]);

  // Boek-widget-blok: laad de widget-data één keer (alleen als er zo'n blok
  // op de pagina staat — top-level of in een container).
  const hasBookingWidget = blocks.some(
    (b) =>
      b.type === "bookingWidget" ||
      (b.type === "container" &&
        b.children.some((c) => c.type === "bookingWidget")),
  );
  const widgetData = hasBookingWidget
    ? await getInlineWidgetData(organizationId)
    : null;

  const ctx = {
    organizationId,
    accent,
    testimonialItemsByBlockId,
    priceTableItemsByBlockId,
    contactBasePath,
    widgetData,
  };

  return (
    <>
      {blocks.map((block) => {
        // Eigen achtergrondkleur per blok: full-bleed sectie-kleur ónder het
        // blok. Leeg = transparant (pagina-achtergrond schijnt door).
        const bg = block.bgColor
          ? { background: block.bgColor }
          : undefined;
        if (block.type === "container") {
          return (
            <div key={block.id} style={bg}>
              <ContainerBlockView block={block} accent={accent}>
                {block.children.map((child) => (
                  <div
                    key={child.id}
                    style={
                      child.bgColor ? { background: child.bgColor } : undefined
                    }
                  >
                    {renderNonContainer(child, ctx)}
                  </div>
                ))}
              </ContainerBlockView>
            </div>
          );
        }
        return (
          <div key={block.id} style={bg}>
            {renderNonContainer(block, ctx)}
          </div>
        );
      })}
    </>
  );
}
