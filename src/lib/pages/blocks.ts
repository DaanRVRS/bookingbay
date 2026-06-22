import { z } from "zod";

// Curated set of Lucide icon names usable in IconRow blocks. Keep this list
// small so the editor stays simple and the rendered bundle stays slim.
export const ICON_KEYS = [
  "Package",
  "Truck",
  "Calendar",
  "Clock",
  "Shield",
  "Star",
  "Heart",
  "MapPin",
  "Phone",
  "Mail",
  "Users",
  "CheckCircle2",
  "Sparkles",
  "ThumbsUp",
  "Tag",
  "Wrench",
] as const;

export type IconKey = (typeof ICON_KEYS)[number];

const idField = z.string().min(1);

const heroBlock = z.object({
  id: idField,
  type: z.literal("hero"),
  heading: z.string().max(120).default(""),
  subheading: z.string().max(280).default(""),
  buttonText: z.string().max(40).default(""),
  buttonHref: z.string().max(200).default(""),
  backgroundImageUrl: z.string().max(500).default(""),
  alignment: z.enum(["left", "center"]).default("left"),
});

const textBlock = z.object({
  id: idField,
  type: z.literal("text"),
  heading: z.string().max(160).default(""),
  body: z.string().max(4000).default(""),
  alignment: z.enum(["left", "center", "right"]).default("left"),
});

const sliderBlock = z.object({
  id: idField,
  type: z.literal("slider"),
  source: z.enum(["categories", "items"]).default("categories"),
  // Optional filter: when source=items, restrict to a single category. When
  // source=categories, restricts to children of the given parent.
  categoryId: z.string().nullable().default(null),
  title: z.string().max(120).default(""),
});

const imageStripBlock = z.object({
  id: idField,
  type: z.literal("imageStrip"),
  images: z
    .array(
      z.object({
        url: z.string().max(500),
        alt: z.string().max(160).default(""),
      }),
    )
    .min(1)
    .max(3)
    .default([]),
});

const iconRowBlock = z.object({
  id: idField,
  type: z.literal("iconRow"),
  heading: z.string().max(160).default(""),
  items: z
    .array(
      z.object({
        icon: z.enum(ICON_KEYS),
        label: z.string().max(60).default(""),
        sublabel: z.string().max(140).default(""),
      }),
    )
    .min(1)
    .max(4)
    .default([]),
});

const ctaBlock = z.object({
  id: idField,
  type: z.literal("cta"),
  heading: z.string().max(120).default(""),
  subheading: z.string().max(220).default(""),
  buttonText: z.string().max(40).default(""),
  buttonHref: z.string().max(200).default(""),
});

const spacerBlock = z.object({
  id: idField,
  type: z.literal("spacer"),
  size: z.enum(["sm", "md", "lg"]).default("md"),
});

const galleryBlock = z.object({
  id: idField,
  type: z.literal("gallery"),
  heading: z.string().max(160).default(""),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  images: z
    .array(
      z.object({
        url: z.string().max(500),
        caption: z.string().max(160).default(""),
      }),
    )
    .min(1)
    .max(12)
    .default([]),
});

const faqBlock = z.object({
  id: idField,
  type: z.literal("faq"),
  heading: z.string().max(160).default(""),
  intro: z.string().max(400).default(""),
  items: z
    .array(
      z.object({
        question: z.string().max(220),
        answer: z.string().max(2000),
      }),
    )
    .min(1)
    .max(20)
    .default([]),
});

const videoBlock = z.object({
  id: idField,
  type: z.literal("video"),
  heading: z.string().max(160).default(""),
  // Accepts a YouTube watch URL, youtu.be shortlink, or Vimeo URL.
  // Renderer extracts the embed URL.
  url: z.string().max(500).default(""),
  caption: z.string().max(280).default(""),
});

const priceTableBlock = z.object({
  id: idField,
  type: z.literal("priceTable"),
  heading: z.string().max(160).default("Prijslijst"),
  intro: z.string().max(400).default(""),
  // "category" — alle (actieve) items uit één categorie. null = hele catalogus.
  // "items"    — handgepikte item-id's, in volgorde van weergave.
  source: z.enum(["category", "items"]).default("category"),
  categoryId: z.string().nullable().default(null),
  itemIds: z.array(z.string().min(1)).max(30).default([]),
  // Welke prijskolommen / -velden tonen we?
  showHour: z.boolean().default(false),
  showDay: z.boolean().default(true),
  showWeek: z.boolean().default(true),
  showDeposit: z.boolean().default(true),
  // "table" — strakke tabel
  // "cards" — kaartrooster (met afbeelding)
  layout: z.enum(["table", "cards"]).default("table"),
  showCta: z.boolean().default(true),
  ctaLabel: z.string().max(40).default("Reserveer"),
});

const testimonialsBlock = z.object({
  id: idField,
  type: z.literal("testimonials"),
  heading: z.string().max(160).default(""),
  intro: z.string().max(400).default(""),
  // "auto"   = pull latest published reviews from the Review collection
  // "manual" = pick specific reviews from the Review collection (by id)
  // "inline" = use the items array typed inside this block (legacy / standalone)
  source: z.enum(["auto", "manual", "inline"]).default("auto"),
  // Used in auto mode — how many reviews to show.
  limit: z.number().int().min(1).max(12).default(3),
  // Used in manual mode — selected review ids in display order.
  reviewIds: z.array(z.string().min(1)).max(12).default([]),
  // Used in inline mode (and as fallback if a Review id was deleted).
  items: z
    .array(
      z.object({
        quote: z.string().max(600),
        author: z.string().max(80).default(""),
        role: z.string().max(120).default(""),
        rating: z
          .union([
            z.literal(0),
            z.literal(1),
            z.literal(2),
            z.literal(3),
            z.literal(4),
            z.literal(5),
          ])
          .default(5),
      }),
    )
    .max(8)
    .default([]),
});

const openingHoursBlock = z.object({
  id: idField,
  type: z.literal("openingHours"),
  heading: z.string().max(160).default(""),
  intro: z.string().max(280).default(""),
  // Index 0 = Monday … 6 = Sunday. Empty open/close = closed.
  days: z
    .array(
      z.object({
        label: z.string().max(20),
        open: z.string().max(8).default(""),
        close: z.string().max(8).default(""),
        closed: z.boolean().default(false),
      }),
    )
    .length(7)
    .default([]),
  note: z.string().max(280).default(""),
});

const mapBlock = z.object({
  id: idField,
  type: z.literal("map"),
  heading: z.string().max(160).default(""),
  address: z.string().max(280).default(""),
  // Either a Google Maps embed src URL, an OpenStreetMap iframe URL, or any
  // iframe src. The renderer wraps it in an <iframe> with sensible defaults.
  embedUrl: z.string().max(800).default(""),
  height: z.union([z.literal("sm"), z.literal("md"), z.literal("lg")]).default("md"),
});

const buttonBlock = z.object({
  id: idField,
  type: z.literal("button"),
  label: z.string().max(60).default("Klik hier"),
  href: z.string().max(200).default("/"),
  variant: z.enum(["primary", "outline", "ghost"]).default("primary"),
  size: z.enum(["sm", "md", "lg"]).default("md"),
  align: z.enum(["left", "center", "right"]).default("center"),
});

const quoteBlock = z.object({
  id: idField,
  type: z.literal("quote"),
  quote: z.string().max(800).default(""),
  author: z.string().max(80).default(""),
  role: z.string().max(120).default(""),
  align: z.enum(["left", "center"]).default("center"),
});

const imageSliderBlock = z.object({
  id: idField,
  type: z.literal("imageSlider"),
  heading: z.string().max(160).default(""),
  // Auto-rotate interval in ms (0 = disabled)
  intervalMs: z.number().int().min(0).max(20000).default(5000),
  aspect: z.enum(["wide", "square", "tall"]).default("wide"),
  slides: z
    .array(
      z.object({
        url: z.string().max(500),
        caption: z.string().max(200).default(""),
        link: z.string().max(200).default(""),
      }),
    )
    .min(1)
    .max(10)
    .default([]),
});

const bookingWidgetBlock = z.object({
  id: idField,
  type: z.literal("bookingWidget"),
  // Optionele kop boven de widget. De widget zelf gebruikt de
  // org-widgetinstellingen (kleur, USP's, taal) — geen losse config nodig.
  heading: z.string().max(160).default(""),
});

const containerBlock = z.object({
  id: idField,
  type: z.literal("container"),
  heading: z.string().max(160).default(""),
  // Visual padding around the inner content
  padding: z.enum(["sm", "md", "lg"]).default("md"),
  // Background variant
  background: z
    .enum(["none", "muted", "card", "primary-soft", "image"])
    .default("none"),
  backgroundImageUrl: z.string().max(500).default(""),
  // Layout direction for children
  layout: z.enum(["stack", "row-2", "row-3"]).default("stack"),
  maxWidth: z.enum(["sm", "md", "lg", "full"]).default("lg"),
  // Children blocks. Excludes "container" itself to avoid arbitrary nesting.
  children: z.array(z.lazy(() => nonContainerBlock)).max(20).default([]),
});

const nonContainerBlock = z.discriminatedUnion("type", [
  heroBlock,
  textBlock,
  sliderBlock,
  imageStripBlock,
  iconRowBlock,
  ctaBlock,
  spacerBlock,
  galleryBlock,
  faqBlock,
  videoBlock,
  priceTableBlock,
  testimonialsBlock,
  openingHoursBlock,
  mapBlock,
  buttonBlock,
  quoteBlock,
  imageSliderBlock,
  bookingWidgetBlock,
]);

export const blockSchema = z.union([nonContainerBlock, containerBlock]);

export const blocksSchema = z.array(blockSchema).max(40);

export type Block = z.infer<typeof blockSchema>;
export type NonContainerBlock = z.infer<typeof nonContainerBlock>;
export type HeroBlock = z.infer<typeof heroBlock>;
export type TextBlock = z.infer<typeof textBlock>;
export type SliderBlock = z.infer<typeof sliderBlock>;
export type ImageStripBlock = z.infer<typeof imageStripBlock>;
export type IconRowBlock = z.infer<typeof iconRowBlock>;
export type CtaBlock = z.infer<typeof ctaBlock>;
export type SpacerBlock = z.infer<typeof spacerBlock>;
export type GalleryBlock = z.infer<typeof galleryBlock>;
export type FaqBlock = z.infer<typeof faqBlock>;
export type VideoBlock = z.infer<typeof videoBlock>;
export type PriceTableBlock = z.infer<typeof priceTableBlock>;
export type TestimonialsBlock = z.infer<typeof testimonialsBlock>;
export type OpeningHoursBlock = z.infer<typeof openingHoursBlock>;
export type MapBlock = z.infer<typeof mapBlock>;
export type ButtonBlock = z.infer<typeof buttonBlock>;
export type QuoteBlock = z.infer<typeof quoteBlock>;
export type ImageSliderBlock = z.infer<typeof imageSliderBlock>;
export type BookingWidgetBlock = z.infer<typeof bookingWidgetBlock>;
export type ContainerBlock = z.infer<typeof containerBlock>;

export type BlockType = Block["type"];

export const BLOCK_LABELS: Record<BlockType, string> = {
  hero: "Hero",
  text: "Tekst",
  slider: "Slider",
  imageStrip: "Afbeeldingen",
  iconRow: "Icon-rij",
  cta: "Call-to-action",
  spacer: "Witruimte",
  gallery: "Galerij",
  faq: "FAQ",
  video: "Video",
  priceTable: "Prijstabel",
  testimonials: "Reviews",
  openingHours: "Openingstijden",
  map: "Kaart",
  button: "Knop",
  quote: "Citaat",
  imageSlider: "Foto-slider",
  bookingWidget: "Boek-widget",
  container: "Container",
};

export const BLOCK_DESCRIPTIONS: Record<BlockType, string> = {
  hero: "Grote bovenste sectie met titel, subtekst en knop",
  text: "Heading + tekstblok, links/midden/rechts uitgelijnd",
  slider: "Horizontale carousel van categorieën of items",
  imageStrip: "1, 2 of 3 afbeeldingen naast elkaar",
  iconRow: "3-4 icons met label, voor 'waarom ons'",
  cta: "Compacte call-to-action met knop",
  spacer: "Verticale witruimte (klein/normaal/groot)",
  gallery: "Galerij van 1 tot 12 afbeeldingen, 2/3/4 kolommen",
  faq: "Inklapbare vraag-en-antwoord-lijst",
  video: "YouTube- of Vimeo-video embedded",
  priceTable: "Prijslijst van je verhuur-items met dag/week/uur tarief",
  testimonials: "Reviews — auto uit lijst, handmatig of inline",
  openingHours: "Tabel met openingstijden per dag",
  map: "Embedded kaart met adres",
  button: "Losse knop met variant en uitlijning",
  quote: "Groot uitgelicht citaat",
  imageSlider: "Auto-roterende foto-carousel met dots & pijlen",
  bookingWidget: "De volledige boek-widget — klanten reserveren direct op deze pagina",
  container: "Wrapper met achtergrond — andere blokken erin slepen",
};

/**
 * Build a fresh block of the given type with sensible defaults.
 * The id is generated client-side via crypto.randomUUID() — passed in.
 */
export function makeDefaultBlock(type: BlockType, id: string): Block {
  switch (type) {
    case "hero":
      return {
        id,
        type: "hero",
        heading: "Welkom",
        subheading: "Een korte introductie waarin je vertelt wat je doet.",
        buttonText: "Bekijk het aanbod",
        buttonHref: "/",
        backgroundImageUrl: "",
        alignment: "left",
      };
    case "text":
      return {
        id,
        type: "text",
        heading: "Een kop",
        body: "Schrijf hier je verhaal. Druk op enter voor een nieuwe alinea.",
        alignment: "left",
      };
    case "slider":
      return { id, type: "slider", source: "categories", categoryId: null, title: "Bekijk onze collectie" };
    case "imageStrip":
      return { id, type: "imageStrip", images: [{ url: "", alt: "" }] };
    case "iconRow":
      return {
        id,
        type: "iconRow",
        heading: "Waarom kiezen voor ons",
        items: [
          { icon: "CheckCircle2", label: "Snelle service", sublabel: "" },
          { icon: "Shield", label: "Betrouwbaar", sublabel: "" },
          { icon: "Star", label: "Goed beoordeeld", sublabel: "" },
        ],
      };
    case "cta":
      return {
        id,
        type: "cta",
        heading: "Klaar om te boeken?",
        subheading: "Neem contact op of bekijk het aanbod.",
        buttonText: "Contact opnemen",
        buttonHref: "/contact",
      };
    case "spacer":
      return { id, type: "spacer", size: "md" };
    case "gallery":
      return {
        id,
        type: "gallery",
        heading: "Galerij",
        columns: 3,
        images: [
          { url: "", caption: "" },
          { url: "", caption: "" },
          { url: "", caption: "" },
        ],
      };
    case "faq":
      return {
        id,
        type: "faq",
        heading: "Veelgestelde vragen",
        intro: "",
        items: [
          {
            question: "Hoe lang van tevoren moet ik reserveren?",
            answer: "Liefst minimaal 24 uur, maar last-minute mag je 't altijd vragen.",
          },
          {
            question: "Wat als ik moet annuleren?",
            answer: "Tot 48 uur van tevoren kosteloos. Daarna brengen we 50% in rekening.",
          },
        ],
      };
    case "video":
      return {
        id,
        type: "video",
        heading: "",
        url: "",
        caption: "",
      };
    case "priceTable":
      return {
        id,
        type: "priceTable",
        heading: "Prijslijst",
        intro: "",
        source: "category",
        categoryId: null,
        itemIds: [],
        showHour: false,
        showDay: true,
        showWeek: true,
        showDeposit: true,
        layout: "table",
        showCta: true,
        ctaLabel: "Reserveer",
      };
    case "testimonials":
      return {
        id,
        type: "testimonials",
        heading: "Wat klanten zeggen",
        intro: "",
        source: "auto",
        limit: 3,
        reviewIds: [],
        items: [],
      };
    case "openingHours":
      return {
        id,
        type: "openingHours",
        heading: "Openingstijden",
        intro: "",
        days: [
          { label: "Maandag", open: "09:00", close: "17:00", closed: false },
          { label: "Dinsdag", open: "09:00", close: "17:00", closed: false },
          { label: "Woensdag", open: "09:00", close: "17:00", closed: false },
          { label: "Donderdag", open: "09:00", close: "17:00", closed: false },
          { label: "Vrijdag", open: "09:00", close: "17:00", closed: false },
          { label: "Zaterdag", open: "10:00", close: "16:00", closed: false },
          { label: "Zondag", open: "", close: "", closed: true },
        ],
        note: "",
      };
    case "map":
      return {
        id,
        type: "map",
        heading: "Hier zit je",
        address: "",
        embedUrl: "",
        height: "md",
      };
    case "button":
      return {
        id,
        type: "button",
        label: "Bekijk meer",
        href: "/contact",
        variant: "primary",
        size: "md",
        align: "center",
      };
    case "quote":
      return {
        id,
        type: "quote",
        quote:
          "We zetten elke dag een stapje extra om jouw verhuur tot een succes te maken.",
        author: "",
        role: "",
        align: "center",
      };
    case "imageSlider":
      return {
        id,
        type: "imageSlider",
        heading: "",
        intervalMs: 5000,
        aspect: "wide",
        slides: [
          { url: "", caption: "", link: "" },
          { url: "", caption: "", link: "" },
          { url: "", caption: "", link: "" },
        ],
      };
    case "bookingWidget":
      return { id, type: "bookingWidget", heading: "Reserveer direct" };
    case "container":
      return {
        id,
        type: "container",
        heading: "",
        padding: "md",
        background: "muted",
        backgroundImageUrl: "",
        layout: "stack",
        maxWidth: "lg",
        children: [],
      };
  }
}

/** Server-side normalizer: parse-or-throw, returns properly typed block array. */
export function parseBlocks(input: unknown): Block[] {
  return blocksSchema.parse(input);
}

/** Safe variant for reading from the DB — falls back to empty array. */
export function safeParseBlocks(input: unknown): Block[] {
  const r = blocksSchema.safeParse(input);
  return r.success ? r.data : [];
}
