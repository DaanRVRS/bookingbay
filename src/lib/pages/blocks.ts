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

export const blockSchema = z.discriminatedUnion("type", [
  heroBlock,
  textBlock,
  sliderBlock,
  imageStripBlock,
  iconRowBlock,
  ctaBlock,
  spacerBlock,
]);

export const blocksSchema = z.array(blockSchema).max(40);

export type Block = z.infer<typeof blockSchema>;
export type HeroBlock = z.infer<typeof heroBlock>;
export type TextBlock = z.infer<typeof textBlock>;
export type SliderBlock = z.infer<typeof sliderBlock>;
export type ImageStripBlock = z.infer<typeof imageStripBlock>;
export type IconRowBlock = z.infer<typeof iconRowBlock>;
export type CtaBlock = z.infer<typeof ctaBlock>;
export type SpacerBlock = z.infer<typeof spacerBlock>;

export type BlockType = Block["type"];

export const BLOCK_LABELS: Record<BlockType, string> = {
  hero: "Hero",
  text: "Tekst",
  slider: "Slider",
  imageStrip: "Afbeeldingen",
  iconRow: "Icon-rij",
  cta: "Call-to-action",
  spacer: "Witruimte",
};

export const BLOCK_DESCRIPTIONS: Record<BlockType, string> = {
  hero: "Grote bovenste sectie met titel, subtekst en knop",
  text: "Heading + tekstblok, links/midden/rechts uitgelijnd",
  slider: "Horizontale carousel van categorieën of items",
  imageStrip: "1, 2 of 3 afbeeldingen naast elkaar",
  iconRow: "3-4 icons met label, voor 'waarom ons'",
  cta: "Compacte call-to-action met knop",
  spacer: "Verticale witruimte (klein/normaal/groot)",
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
