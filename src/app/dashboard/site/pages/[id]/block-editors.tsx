"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/dashboard/ImageUploader";
// Plus and Trash2 are referenced by the new gallery + faq editors below
import {
  BLOCK_DESCRIPTIONS,
  BLOCK_LABELS,
  ICON_KEYS,
  makeDefaultBlock,
  type Block,
  type BlockType,
  type ContainerBlock,
  type NonContainerBlock,
} from "@/lib/pages/blocks";

const NON_CONTAINER_PALETTE: BlockType[] = [
  "hero",
  "text",
  "imageStrip",
  "gallery",
  "iconRow",
  "priceTable",
  "testimonials",
  "openingHours",
  "map",
  "faq",
  "video",
  "cta",
  "button",
  "quote",
  "imageSlider",
  "spacer",
];

function newBlockId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `b_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

type CategoryRef = { id: string; name: string; parentId: string | null };
type ReviewRef = {
  id: string;
  author: string;
  quote: string;
  isPublished: boolean;
};
type ItemRef = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  pricePerHour: number | null;
  pricePerDay: number | null;
  pricePerWeek: number | null;
  deposit: number | null;
  categoryName: string;
};

export function BlockEditor({
  block,
  onChange,
  categories,
  reviews,
  items,
}: {
  block: Block;
  onChange: (patch: Partial<Block>) => void;
  categories: CategoryRef[];
  reviews: ReviewRef[];
  items: ItemRef[];
}) {
  switch (block.type) {
    case "hero":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Titel" className="sm:col-span-2">
            <Input
              value={block.heading}
              maxLength={120}
              onChange={(e) => onChange({ heading: e.target.value } as Partial<Block>)}
            />
          </Field>
          <Field label="Subtekst" className="sm:col-span-2">
            <Textarea
              value={block.subheading}
              rows={2}
              maxLength={280}
              onChange={(e) => onChange({ subheading: e.target.value } as Partial<Block>)}
            />
          </Field>
          <Field label="Knop-tekst">
            <Input
              value={block.buttonText}
              maxLength={40}
              placeholder="Bekijk het aanbod"
              onChange={(e) => onChange({ buttonText: e.target.value } as Partial<Block>)}
            />
          </Field>
          <Field label="Knop-link">
            <Input
              value={block.buttonHref}
              maxLength={200}
              placeholder="/contact"
              onChange={(e) => onChange({ buttonHref: e.target.value } as Partial<Block>)}
            />
          </Field>
          <Field label="Achtergrond-afbeelding" className="sm:col-span-2">
            <ImageUploader
              value={block.backgroundImageUrl || null}
              onChange={(url) => onChange({ backgroundImageUrl: url ?? "" } as Partial<Block>)}
            />
          </Field>
          <Field label="Uitlijning" className="sm:col-span-2">
            <Toggle
              value={block.alignment}
              onChange={(v) => onChange({ alignment: v } as Partial<Block>)}
              options={[
                { value: "left", label: "Links" },
                { value: "center", label: "Midden" },
              ]}
            />
          </Field>
        </div>
      );

    case "text":
      return (
        <div className="grid gap-4">
          <Field label="Kop">
            <Input
              value={block.heading}
              maxLength={160}
              onChange={(e) => onChange({ heading: e.target.value } as Partial<Block>)}
            />
          </Field>
          <Field label="Tekst">
            <Textarea
              value={block.body}
              rows={6}
              maxLength={4000}
              onChange={(e) => onChange({ body: e.target.value } as Partial<Block>)}
            />
          </Field>
          <Field label="Uitlijning">
            <Toggle
              value={block.alignment}
              onChange={(v) => onChange({ alignment: v } as Partial<Block>)}
              options={[
                { value: "left", label: "Links" },
                { value: "center", label: "Midden" },
                { value: "right", label: "Rechts" },
              ]}
            />
          </Field>
        </div>
      );

    case "slider":
      return (
        <div className="grid gap-4">
          <Field label="Titel">
            <Input
              value={block.title}
              maxLength={120}
              onChange={(e) => onChange({ title: e.target.value } as Partial<Block>)}
            />
          </Field>
          <Field label="Bron">
            <Toggle
              value={block.source}
              onChange={(v) => onChange({ source: v, categoryId: null } as Partial<Block>)}
              options={[
                { value: "categories", label: "Categorieën" },
                { value: "items", label: "Items" },
              ]}
            />
          </Field>
          <Field
            label={
              block.source === "categories"
                ? "Subcategorieën van (optioneel)"
                : "Filter op categorie (optioneel)"
            }
          >
            <select
              value={block.categoryId ?? ""}
              onChange={(e) =>
                onChange({ categoryId: e.target.value || null } as Partial<Block>)
              }
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">— Alle —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parentId ? "  ↳ " : ""}
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      );

    case "imageStrip":
      return (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            Tot 3 afbeeldingen naast elkaar. Sleep de uploader om er één te kiezen.
          </p>
          <div className="flex flex-col gap-3">
            {block.images.map((img, idx) => (
              <div
                key={idx}
                className="rounded-md border border-border bg-background p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Afbeelding {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        images: block.images.filter((_, i) => i !== idx),
                      } as Partial<Block>)
                    }
                    className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Verwijderen"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <ImageUploader
                  value={img.url || null}
                  onChange={(url) => {
                    const next = [...block.images];
                    next[idx] = { ...next[idx], url: url ?? "" };
                    onChange({ images: next } as Partial<Block>);
                  }}
                />
                <div className="mt-2">
                  <Label className="text-[11px]">Alt-tekst</Label>
                  <Input
                    value={img.alt}
                    maxLength={160}
                    placeholder="Voor toegankelijkheid"
                    onChange={(e) => {
                      const next = [...block.images];
                      next[idx] = { ...next[idx], alt: e.target.value };
                      onChange({ images: next } as Partial<Block>);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          {block.images.length < 3 && (
            <button
              type="button"
              onClick={() =>
                onChange({
                  images: [...block.images, { url: "", alt: "" }],
                } as Partial<Block>)
              }
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-dashed border-border text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Plus className="size-4" /> Afbeelding toevoegen
            </button>
          )}
        </div>
      );

    case "iconRow":
      return (
        <div className="flex flex-col gap-4">
          <Field label="Kop (optioneel)">
            <Input
              value={block.heading}
              maxLength={160}
              onChange={(e) => onChange({ heading: e.target.value } as Partial<Block>)}
            />
          </Field>
          <div className="flex flex-col gap-3">
            {block.items.map((item, idx) => (
              <div
                key={idx}
                className="grid gap-2 rounded-md border border-border bg-background p-3 sm:grid-cols-[auto_1fr_auto]"
              >
                <select
                  value={item.icon}
                  onChange={(e) => {
                    const next = [...block.items];
                    next[idx] = {
                      ...next[idx],
                      icon: e.target.value as (typeof ICON_KEYS)[number],
                    };
                    onChange({ items: next } as Partial<Block>);
                  }}
                  className="h-9 rounded-md border border-border bg-background px-2 text-sm sm:w-32"
                >
                  {ICON_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
                <div className="flex flex-col gap-1.5">
                  <Input
                    value={item.label}
                    placeholder="Label"
                    maxLength={60}
                    onChange={(e) => {
                      const next = [...block.items];
                      next[idx] = { ...next[idx], label: e.target.value };
                      onChange({ items: next } as Partial<Block>);
                    }}
                  />
                  <Input
                    value={item.sublabel}
                    placeholder="Sublabel (optioneel)"
                    maxLength={140}
                    onChange={(e) => {
                      const next = [...block.items];
                      next[idx] = { ...next[idx], sublabel: e.target.value };
                      onChange({ items: next } as Partial<Block>);
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      items: block.items.filter((_, i) => i !== idx),
                    } as Partial<Block>)
                  }
                  className="grid size-8 place-items-center self-start rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Verwijderen"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
          {block.items.length < 4 && (
            <button
              type="button"
              onClick={() =>
                onChange({
                  items: [
                    ...block.items,
                    { icon: "CheckCircle2", label: "", sublabel: "" },
                  ],
                } as Partial<Block>)
              }
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-dashed border-border text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Plus className="size-4" /> Icon toevoegen
            </button>
          )}
        </div>
      );

    case "cta":
      return (
        <div className="grid gap-4">
          <Field label="Kop">
            <Input
              value={block.heading}
              maxLength={120}
              onChange={(e) => onChange({ heading: e.target.value } as Partial<Block>)}
            />
          </Field>
          <Field label="Subtekst">
            <Textarea
              value={block.subheading}
              rows={2}
              maxLength={220}
              onChange={(e) => onChange({ subheading: e.target.value } as Partial<Block>)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Knop-tekst">
              <Input
                value={block.buttonText}
                maxLength={40}
                onChange={(e) => onChange({ buttonText: e.target.value } as Partial<Block>)}
              />
            </Field>
            <Field label="Knop-link">
              <Input
                value={block.buttonHref}
                maxLength={200}
                placeholder="/contact"
                onChange={(e) => onChange({ buttonHref: e.target.value } as Partial<Block>)}
              />
            </Field>
          </div>
        </div>
      );

    case "spacer":
      return (
        <Field label="Hoogte">
          <Toggle
            value={block.size}
            onChange={(v) => onChange({ size: v } as Partial<Block>)}
            options={[
              { value: "sm", label: "Klein" },
              { value: "md", label: "Normaal" },
              { value: "lg", label: "Groot" },
            ]}
          />
        </Field>
      );

    case "gallery":
      return (
        <div className="flex flex-col gap-4">
          <Field label="Heading (optioneel)">
            <Input
              value={block.heading}
              maxLength={160}
              placeholder="Onze locatie in beeld"
              onChange={(e) => onChange({ heading: e.target.value } as Partial<Block>)}
            />
          </Field>
          <Field label="Aantal kolommen">
            <Toggle
              value={String(block.columns) as "2" | "3" | "4"}
              onChange={(v) =>
                onChange({ columns: Number(v) as 2 | 3 | 4 } as Partial<Block>)
              }
              options={[
                { value: "2", label: "2" },
                { value: "3", label: "3" },
                { value: "4", label: "4" },
              ]}
            />
          </Field>
          <div className="flex flex-col gap-3">
            {block.images.map((img, i) => (
              <div
                key={i}
                className="rounded-md border border-border bg-background/40 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Afbeelding {i + 1}
                  </span>
                  {block.images.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...block.images];
                        next.splice(i, 1);
                        onChange({ images: next } as Partial<Block>);
                      }}
                      className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Verwijder afbeelding"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
                <ImageUploader
                  value={img.url || null}
                  onChange={(url) => {
                    const next = [...block.images];
                    next[i] = { ...next[i], url: url ?? "" };
                    onChange({ images: next } as Partial<Block>);
                  }}
                />
                <div className="mt-2">
                  <Input
                    value={img.caption}
                    maxLength={160}
                    placeholder="Onderschrift (optioneel)"
                    onChange={(e) => {
                      const next = [...block.images];
                      next[i] = { ...next[i], caption: e.target.value };
                      onChange({ images: next } as Partial<Block>);
                    }}
                  />
                </div>
              </div>
            ))}
            {block.images.length < 12 && (
              <button
                type="button"
                onClick={() =>
                  onChange({
                    images: [...block.images, { url: "", caption: "" }],
                  } as Partial<Block>)
                }
                className="inline-flex items-center justify-center gap-1 rounded-md border border-dashed border-border py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Plus className="size-3.5" />
                Afbeelding toevoegen
              </button>
            )}
          </div>
        </div>
      );

    case "faq":
      return (
        <div className="flex flex-col gap-4">
          <Field label="Heading">
            <Input
              value={block.heading}
              maxLength={160}
              placeholder="Veelgestelde vragen"
              onChange={(e) => onChange({ heading: e.target.value } as Partial<Block>)}
            />
          </Field>
          <Field label="Korte introtekst (optioneel)">
            <Textarea
              value={block.intro}
              rows={2}
              maxLength={400}
              onChange={(e) => onChange({ intro: e.target.value } as Partial<Block>)}
            />
          </Field>
          <div className="flex flex-col gap-3">
            {block.items.map((item, i) => (
              <div
                key={i}
                className="rounded-md border border-border bg-background/40 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Vraag {i + 1}
                  </span>
                  {block.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...block.items];
                        next.splice(i, 1);
                        onChange({ items: next } as Partial<Block>);
                      }}
                      className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Verwijder"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Input
                    value={item.question}
                    maxLength={220}
                    placeholder="Vraag"
                    onChange={(e) => {
                      const next = [...block.items];
                      next[i] = { ...next[i], question: e.target.value };
                      onChange({ items: next } as Partial<Block>);
                    }}
                  />
                  <Textarea
                    value={item.answer}
                    rows={3}
                    maxLength={2000}
                    placeholder="Antwoord"
                    onChange={(e) => {
                      const next = [...block.items];
                      next[i] = { ...next[i], answer: e.target.value };
                      onChange({ items: next } as Partial<Block>);
                    }}
                  />
                </div>
              </div>
            ))}
            {block.items.length < 20 && (
              <button
                type="button"
                onClick={() =>
                  onChange({
                    items: [...block.items, { question: "", answer: "" }],
                  } as Partial<Block>)
                }
                className="inline-flex items-center justify-center gap-1 rounded-md border border-dashed border-border py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Plus className="size-3.5" />
                Vraag toevoegen
              </button>
            )}
          </div>
        </div>
      );

    case "video":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Heading (optioneel)" className="sm:col-span-2">
            <Input
              value={block.heading}
              maxLength={160}
              placeholder="Bekijk de demo"
              onChange={(e) => onChange({ heading: e.target.value } as Partial<Block>)}
            />
          </Field>
          <Field label="YouTube- of Vimeo-URL" className="sm:col-span-2">
            <Input
              value={block.url}
              maxLength={500}
              placeholder="https://www.youtube.com/watch?v=..."
              onChange={(e) => onChange({ url: e.target.value } as Partial<Block>)}
            />
          </Field>
          <Field label="Onderschrift (optioneel)" className="sm:col-span-2">
            <Input
              value={block.caption}
              maxLength={280}
              onChange={(e) => onChange({ caption: e.target.value } as Partial<Block>)}
            />
          </Field>
        </div>
      );

    case "priceTable": {
      const noItems = items.length === 0;
      return (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Heading">
              <Input
                value={block.heading}
                maxLength={160}
                placeholder="Prijslijst"
                onChange={(e) => onChange({ heading: e.target.value } as Partial<Block>)}
              />
            </Field>
            <Field label="Layout">
              <Toggle
                value={block.layout}
                onChange={(v) => onChange({ layout: v } as Partial<Block>)}
                options={[
                  { value: "table", label: "Tabel" },
                  { value: "cards", label: "Kaarten" },
                ]}
              />
            </Field>
          </div>
          <Field label="Introtekst (optioneel)">
            <Textarea
              value={block.intro}
              rows={2}
              maxLength={400}
              onChange={(e) => onChange({ intro: e.target.value } as Partial<Block>)}
            />
          </Field>

          <Field label="Bron">
            <Toggle
              value={block.source}
              onChange={(v) =>
                onChange({
                  source: v,
                  // Clear the other side to keep state clean
                  ...(v === "category"
                    ? { itemIds: [] }
                    : { categoryId: null }),
                } as Partial<Block>)
              }
              options={[
                { value: "category", label: "Per categorie" },
                { value: "items", label: "Specifieke items" },
              ]}
            />
          </Field>

          {block.source === "category" && (
            <Field label="Categorie">
              <select
                value={block.categoryId ?? ""}
                onChange={(e) =>
                  onChange({
                    categoryId: e.target.value || null,
                  } as Partial<Block>)
                }
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              >
                <option value="">Alle categorieën</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parentId ? "↳ " : ""}{c.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {block.source === "items" && (
            <div className="rounded-md border border-border bg-background/40 p-3">
              <p className="text-xs text-muted-foreground">
                Vink de items aan die je wil tonen.
                {noItems && (
                  <span className="mt-1 block text-[oklch(0.5_0.16_70)]">
                    Geen actieve items gevonden. Voeg ze eerst toe in
                    Catalogus.
                  </span>
                )}
              </p>
              <div className="mt-2 flex max-h-72 flex-col gap-1 overflow-y-auto">
                {items.map((it) => {
                  const checked = block.itemIds.includes(it.id);
                  return (
                    <label
                      key={it.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background p-2 hover:bg-accent"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          let next = block.itemIds.filter((id) => id !== it.id);
                          if (e.target.checked) next = [...next, it.id];
                          onChange({ itemIds: next } as Partial<Block>);
                        }}
                        className="size-4 rounded border-border accent-primary"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{it.name}</p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {it.categoryName}
                          {it.pricePerDay !== null && (
                            <> · €{it.pricePerDay.toFixed(2)} / dag</>
                          )}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <Field label="Kolommen">
            <div className="flex flex-wrap gap-3">
              <Checkbox
                label="Per uur"
                checked={block.showHour}
                onChange={(v) => onChange({ showHour: v } as Partial<Block>)}
              />
              <Checkbox
                label="Per dag"
                checked={block.showDay}
                onChange={(v) => onChange({ showDay: v } as Partial<Block>)}
              />
              <Checkbox
                label="Per week"
                checked={block.showWeek}
                onChange={(v) => onChange({ showWeek: v } as Partial<Block>)}
              />
              <Checkbox
                label="Borg"
                checked={block.showDeposit}
                onChange={(v) => onChange({ showDeposit: v } as Partial<Block>)}
              />
            </div>
          </Field>

          <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background p-2 text-xs">
              <input
                type="checkbox"
                checked={block.showCta}
                onChange={(e) =>
                  onChange({ showCta: e.target.checked } as Partial<Block>)
                }
                className="size-4 rounded border-border accent-primary"
              />
              <span>Reserveer-knop tonen</span>
            </label>
            {block.showCta && (
              <Input
                value={block.ctaLabel}
                maxLength={40}
                placeholder="Reserveer"
                onChange={(e) =>
                  onChange({ ctaLabel: e.target.value } as Partial<Block>)
                }
              />
            )}
          </div>
        </div>
      );
    }

    case "testimonials": {
      const publishedReviews = reviews.filter((r) => r.isPublished);
      const noPublished = publishedReviews.length === 0;
      return (
        <div className="flex flex-col gap-4">
          <Field label="Heading">
            <Input
              value={block.heading}
              maxLength={160}
              placeholder="Wat klanten zeggen"
              onChange={(e) => onChange({ heading: e.target.value } as Partial<Block>)}
            />
          </Field>
          <Field label="Introtekst (optioneel)">
            <Textarea
              value={block.intro}
              rows={2}
              maxLength={400}
              onChange={(e) => onChange({ intro: e.target.value } as Partial<Block>)}
            />
          </Field>
          <Field label="Bron">
            <Toggle
              value={block.source}
              onChange={(v) => onChange({ source: v } as Partial<Block>)}
              options={[
                { value: "auto", label: "Auto" },
                { value: "manual", label: "Handmatig kiezen" },
                { value: "inline", label: "Inline" },
              ]}
            />
          </Field>

          {block.source === "auto" && (
            <div className="rounded-md border border-border bg-background/40 p-3">
              <p className="text-xs text-muted-foreground">
                Toont je nieuwste gepubliceerde reviews uit{" "}
                <a className="underline" href="/dashboard/reviews" target="_blank" rel="noreferrer">
                  Reviews
                </a>
                .
                {noPublished && (
                  <span className="block mt-1 text-[oklch(0.5_0.16_70)]">
                    Nog geen gepubliceerde reviews. Voeg er eerst een paar toe.
                  </span>
                )}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Maximaal:</span>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={block.limit}
                  onChange={(e) => {
                    const v = Math.max(1, Math.min(12, Number(e.target.value) || 3));
                    onChange({ limit: v } as Partial<Block>);
                  }}
                  className="h-8 w-16 rounded-md border border-border bg-background px-2 text-sm tabular-nums"
                />
              </div>
            </div>
          )}

          {block.source === "manual" && (
            <div className="rounded-md border border-border bg-background/40 p-3">
              <p className="text-xs text-muted-foreground">
                Vink de reviews aan die je wil tonen.
                {noPublished && (
                  <span className="block mt-1 text-[oklch(0.5_0.16_70)]">
                    Geen gepubliceerde reviews beschikbaar.
                  </span>
                )}
              </p>
              <div className="mt-2 flex max-h-72 flex-col gap-1 overflow-y-auto">
                {publishedReviews.map((r) => {
                  const checked = block.reviewIds.includes(r.id);
                  return (
                    <label
                      key={r.id}
                      className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-background p-2 hover:bg-accent"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          let next = block.reviewIds.filter((id) => id !== r.id);
                          if (e.target.checked) next = [...next, r.id];
                          onChange({ reviewIds: next } as Partial<Block>);
                        }}
                        className="mt-1 size-4 rounded border-border accent-primary"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">{r.author}</p>
                        <p className="line-clamp-2 text-[11px] text-muted-foreground">
                          {r.quote}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {block.source === "inline" && (
            <div className="flex flex-col gap-3">
              {block.items.map((item, i) => (
                <div
                  key={i}
                  className="rounded-md border border-border bg-background/40 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Review {i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...block.items];
                        next.splice(i, 1);
                        onChange({ items: next } as Partial<Block>);
                      }}
                      className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Verwijder"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <Textarea
                    value={item.quote}
                    rows={3}
                    maxLength={600}
                    placeholder="Citaat"
                    onChange={(e) => {
                      const next = [...block.items];
                      next[i] = { ...next[i], quote: e.target.value };
                      onChange({ items: next } as Partial<Block>);
                    }}
                  />
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    <Input
                      value={item.author}
                      maxLength={80}
                      placeholder="Auteur"
                      onChange={(e) => {
                        const next = [...block.items];
                        next[i] = { ...next[i], author: e.target.value };
                        onChange({ items: next } as Partial<Block>);
                      }}
                    />
                    <Input
                      value={item.role}
                      maxLength={120}
                      placeholder="Rol/locatie"
                      onChange={(e) => {
                        const next = [...block.items];
                        next[i] = { ...next[i], role: e.target.value };
                        onChange({ items: next } as Partial<Block>);
                      }}
                    />
                    <Toggle
                      value={String(item.rating) as "0" | "3" | "4" | "5"}
                      onChange={(v) => {
                        const next = [...block.items];
                        const rating = Number(v) as 0 | 3 | 4 | 5;
                        next[i] = { ...next[i], rating };
                        onChange({ items: next } as Partial<Block>);
                      }}
                      options={[
                        { value: "5", label: "★★★★★" },
                        { value: "4", label: "★★★★" },
                        { value: "3", label: "★★★" },
                        { value: "0", label: "—" },
                      ]}
                    />
                  </div>
                </div>
              ))}
              {block.items.length < 8 && (
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      items: [
                        ...block.items,
                        { quote: "", author: "", role: "", rating: 5 },
                      ],
                    } as Partial<Block>)
                  }
                  className="inline-flex items-center justify-center gap-1 rounded-md border border-dashed border-border py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Plus className="size-3.5" /> Review toevoegen
                </button>
              )}
            </div>
          )}
        </div>
      );
    }

    case "openingHours":
      return (
        <div className="flex flex-col gap-4">
          <Field label="Heading">
            <Input
              value={block.heading}
              maxLength={160}
              placeholder="Openingstijden"
              onChange={(e) => onChange({ heading: e.target.value } as Partial<Block>)}
            />
          </Field>
          <Field label="Introtekst (optioneel)">
            <Input
              value={block.intro}
              maxLength={280}
              onChange={(e) => onChange({ intro: e.target.value } as Partial<Block>)}
            />
          </Field>
          <div className="flex flex-col gap-2">
            {block.days.map((d, i) => (
              <div
                key={i}
                className="grid items-center gap-2 rounded-md border border-border bg-background/40 p-2 sm:grid-cols-[120px_1fr_1fr_auto]"
              >
                <Input
                  value={d.label}
                  maxLength={20}
                  onChange={(e) => {
                    const next = [...block.days];
                    next[i] = { ...next[i], label: e.target.value };
                    onChange({ days: next } as Partial<Block>);
                  }}
                />
                <Input
                  value={d.open}
                  maxLength={8}
                  placeholder="09:00"
                  disabled={d.closed}
                  onChange={(e) => {
                    const next = [...block.days];
                    next[i] = { ...next[i], open: e.target.value };
                    onChange({ days: next } as Partial<Block>);
                  }}
                />
                <Input
                  value={d.close}
                  maxLength={8}
                  placeholder="17:00"
                  disabled={d.closed}
                  onChange={(e) => {
                    const next = [...block.days];
                    next[i] = { ...next[i], close: e.target.value };
                    onChange({ days: next } as Partial<Block>);
                  }}
                />
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={d.closed}
                    onChange={(e) => {
                      const next = [...block.days];
                      next[i] = { ...next[i], closed: e.target.checked };
                      onChange({ days: next } as Partial<Block>);
                    }}
                  />
                  Gesloten
                </label>
              </div>
            ))}
          </div>
          <Field label="Notitie (optioneel)">
            <Input
              value={block.note}
              maxLength={280}
              placeholder="bv. Op feestdagen gesloten"
              onChange={(e) => onChange({ note: e.target.value } as Partial<Block>)}
            />
          </Field>
        </div>
      );

    case "map":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Heading" className="sm:col-span-2">
            <Input
              value={block.heading}
              maxLength={160}
              placeholder="Hier zit je"
              onChange={(e) => onChange({ heading: e.target.value } as Partial<Block>)}
            />
          </Field>
          <Field label="Adres-tekst (zichtbaar)" className="sm:col-span-2">
            <Textarea
              value={block.address}
              rows={2}
              maxLength={280}
              placeholder="Hoofdstraat 1, 1234 AB Amsterdam"
              onChange={(e) => onChange({ address: e.target.value } as Partial<Block>)}
            />
          </Field>
          <Field label="Embed-URL (Google Maps embed src)" className="sm:col-span-2">
            <Input
              value={block.embedUrl}
              maxLength={800}
              placeholder="https://www.google.com/maps/embed?pb=..."
              onChange={(e) => onChange({ embedUrl: e.target.value } as Partial<Block>)}
            />
          </Field>
          <Field label="Hoogte" className="sm:col-span-2">
            <Toggle
              value={block.height}
              onChange={(v) => onChange({ height: v } as Partial<Block>)}
              options={[
                { value: "sm", label: "Klein" },
                { value: "md", label: "Normaal" },
                { value: "lg", label: "Groot" },
              ]}
            />
          </Field>
        </div>
      );

    case "button":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tekst" className="sm:col-span-2">
            <Input
              value={block.label}
              maxLength={60}
              onChange={(e) => onChange({ label: e.target.value } as Partial<Block>)}
            />
          </Field>
          <Field label="Link" className="sm:col-span-2">
            <Input
              value={block.href}
              maxLength={200}
              placeholder="/contact"
              onChange={(e) => onChange({ href: e.target.value } as Partial<Block>)}
            />
          </Field>
          <Field label="Stijl">
            <Toggle
              value={block.variant}
              onChange={(v) => onChange({ variant: v } as Partial<Block>)}
              options={[
                { value: "primary", label: "Primair" },
                { value: "outline", label: "Outline" },
                { value: "ghost", label: "Tekst" },
              ]}
            />
          </Field>
          <Field label="Grootte">
            <Toggle
              value={block.size}
              onChange={(v) => onChange({ size: v } as Partial<Block>)}
              options={[
                { value: "sm", label: "S" },
                { value: "md", label: "M" },
                { value: "lg", label: "L" },
              ]}
            />
          </Field>
          <Field label="Uitlijning" className="sm:col-span-2">
            <Toggle
              value={block.align}
              onChange={(v) => onChange({ align: v } as Partial<Block>)}
              options={[
                { value: "left", label: "Links" },
                { value: "center", label: "Midden" },
                { value: "right", label: "Rechts" },
              ]}
            />
          </Field>
        </div>
      );

    case "quote":
      return (
        <div className="flex flex-col gap-4">
          <Field label="Citaat">
            <Textarea
              value={block.quote}
              rows={4}
              maxLength={800}
              onChange={(e) => onChange({ quote: e.target.value } as Partial<Block>)}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Auteur (optioneel)">
              <Input
                value={block.author}
                maxLength={80}
                onChange={(e) => onChange({ author: e.target.value } as Partial<Block>)}
              />
            </Field>
            <Field label="Rol/locatie (optioneel)">
              <Input
                value={block.role}
                maxLength={120}
                onChange={(e) => onChange({ role: e.target.value } as Partial<Block>)}
              />
            </Field>
          </div>
          <Field label="Uitlijning">
            <Toggle
              value={block.align}
              onChange={(v) => onChange({ align: v } as Partial<Block>)}
              options={[
                { value: "left", label: "Links" },
                { value: "center", label: "Midden" },
              ]}
            />
          </Field>
        </div>
      );

    case "imageSlider":
      return (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Heading (optioneel)">
              <Input
                value={block.heading}
                maxLength={160}
                onChange={(e) => onChange({ heading: e.target.value } as Partial<Block>)}
              />
            </Field>
            <Field label="Verhouding">
              <Toggle
                value={block.aspect}
                onChange={(v) => onChange({ aspect: v } as Partial<Block>)}
                options={[
                  { value: "wide", label: "Breed" },
                  { value: "square", label: "Vierkant" },
                  { value: "tall", label: "Hoog" },
                ]}
              />
            </Field>
            <Field label="Auto-rotate">
              <select
                value={String(block.intervalMs)}
                onChange={(e) =>
                  onChange({ intervalMs: Number(e.target.value) } as Partial<Block>)
                }
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              >
                <option value="0">Uit</option>
                <option value="3000">3s</option>
                <option value="5000">5s</option>
                <option value="8000">8s</option>
                <option value="12000">12s</option>
              </select>
            </Field>
          </div>
          <div className="flex flex-col gap-3">
            {block.slides.map((s, i) => (
              <div
                key={i}
                className="rounded-md border border-border bg-background/40 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Slide {i + 1}
                  </span>
                  {block.slides.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...block.slides];
                        next.splice(i, 1);
                        onChange({ slides: next } as Partial<Block>);
                      }}
                      className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Verwijder"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
                <ImageUploader
                  value={s.url || null}
                  onChange={(url) => {
                    const next = [...block.slides];
                    next[i] = { ...next[i], url: url ?? "" };
                    onChange({ slides: next } as Partial<Block>);
                  }}
                />
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Input
                    value={s.caption}
                    maxLength={200}
                    placeholder="Onderschrift (optioneel)"
                    onChange={(e) => {
                      const next = [...block.slides];
                      next[i] = { ...next[i], caption: e.target.value };
                      onChange({ slides: next } as Partial<Block>);
                    }}
                  />
                  <Input
                    value={s.link}
                    maxLength={200}
                    placeholder="Link bij klik (optioneel)"
                    onChange={(e) => {
                      const next = [...block.slides];
                      next[i] = { ...next[i], link: e.target.value };
                      onChange({ slides: next } as Partial<Block>);
                    }}
                  />
                </div>
              </div>
            ))}
            {block.slides.length < 10 && (
              <button
                type="button"
                onClick={() =>
                  onChange({
                    slides: [...block.slides, { url: "", caption: "", link: "" }],
                  } as Partial<Block>)
                }
                className="inline-flex items-center justify-center gap-1 rounded-md border border-dashed border-border py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Plus className="size-3.5" /> Slide toevoegen
              </button>
            )}
          </div>
        </div>
      );

    case "container":
      return <ContainerEditor block={block} onChange={onChange} />;
  }
}

function ContainerEditor({
  block,
  onChange,
}: {
  block: ContainerBlock;
  onChange: (patch: Partial<Block>) => void;
}) {
  const updateChild = (childId: string, patch: Partial<NonContainerBlock>) => {
    const children = block.children.map((c) =>
      c.id === childId ? ({ ...c, ...patch } as NonContainerBlock) : c,
    );
    onChange({ children } as Partial<Block>);
  };

  const removeChild = (childId: string) => {
    onChange({
      children: block.children.filter((c) => c.id !== childId),
    } as Partial<Block>);
  };

  const moveChild = (childId: string, dir: -1 | 1) => {
    const idx = block.children.findIndex((c) => c.id === childId);
    if (idx === -1) return;
    const target = idx + dir;
    if (target < 0 || target >= block.children.length) return;
    const next = [...block.children];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange({ children: next } as Partial<Block>);
  };

  const addChild = (type: BlockType) => {
    if (type === "container") return;
    const created = makeDefaultBlock(type, newBlockId()) as NonContainerBlock;
    onChange({ children: [...block.children, created] } as Partial<Block>);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Heading (optioneel)">
          <Input
            value={block.heading}
            maxLength={160}
            onChange={(e) => onChange({ heading: e.target.value } as Partial<Block>)}
          />
        </Field>
        <Field label="Layout">
          <Toggle
            value={block.layout}
            onChange={(v) => onChange({ layout: v } as Partial<Block>)}
            options={[
              { value: "stack", label: "Onder elkaar" },
              { value: "row-2", label: "2 kolommen" },
              { value: "row-3", label: "3 kolommen" },
            ]}
          />
        </Field>
        <Field label="Achtergrond">
          <Toggle
            value={block.background}
            onChange={(v) => onChange({ background: v } as Partial<Block>)}
            options={[
              { value: "none", label: "Geen" },
              { value: "muted", label: "Grijs" },
              { value: "card", label: "Wit" },
              { value: "primary-soft", label: "Brand" },
              { value: "image", label: "Foto" },
            ]}
          />
        </Field>
        <Field label="Padding">
          <Toggle
            value={block.padding}
            onChange={(v) => onChange({ padding: v } as Partial<Block>)}
            options={[
              { value: "sm", label: "S" },
              { value: "md", label: "M" },
              { value: "lg", label: "L" },
            ]}
          />
        </Field>
        <Field label="Max breedte">
          <Toggle
            value={block.maxWidth}
            onChange={(v) => onChange({ maxWidth: v } as Partial<Block>)}
            options={[
              { value: "sm", label: "S" },
              { value: "md", label: "M" },
              { value: "lg", label: "L" },
              { value: "full", label: "Vol" },
            ]}
          />
        </Field>
        {block.background === "image" && (
          <Field label="Achtergrond-afbeelding" className="sm:col-span-2">
            <ImageUploader
              value={block.backgroundImageUrl || null}
              onChange={(url) =>
                onChange({ backgroundImageUrl: url ?? "" } as Partial<Block>)
              }
            />
          </Field>
        )}
      </div>

      <div className="rounded-md border border-border bg-background/40 p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Inhoud — {block.children.length}
          {block.children.length === 1 ? " blok" : " blokken"}
        </p>
        {block.children.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-card/40 px-4 py-6 text-center text-xs text-muted-foreground">
            Container is leeg. Voeg een blok toe ↓
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {block.children.map((child, idx) => (
              <li
                key={child.id}
                className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2"
              >
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  {BLOCK_LABELS[child.type]}
                </span>
                <span className="flex-1 truncate text-xs text-muted-foreground">
                  {previewLabel(child)}
                </span>
                <button
                  type="button"
                  onClick={() => moveChild(child.id, -1)}
                  disabled={idx === 0}
                  className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-accent disabled:opacity-30"
                  aria-label="Omhoog"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveChild(child.id, 1)}
                  disabled={idx === block.children.length - 1}
                  className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-accent disabled:opacity-30"
                  aria-label="Omlaag"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newQuote = window.prompt(
                      "Snel bewerken — voor uitgebreid bewerken, plaats het blok op het top-niveau.",
                      previewLabel(child),
                    );
                    if (newQuote === null) return;
                    // Generic quick-edit: try common text fields
                    if ("heading" in child) {
                      updateChild(child.id, { heading: newQuote } as Partial<NonContainerBlock>);
                    } else if (child.type === "button") {
                      updateChild(child.id, { label: newQuote } as Partial<NonContainerBlock>);
                    } else if (child.type === "quote") {
                      updateChild(child.id, { quote: newQuote } as Partial<NonContainerBlock>);
                    }
                  }}
                  className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-accent"
                  aria-label="Snel bewerken"
                  title="Snel bewerken"
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={() => removeChild(child.id)}
                  className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Verwijder"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <details className="mt-3">
          <summary className="cursor-pointer rounded-md border border-dashed border-border py-2 text-center text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
            <Plus className="mr-1 inline size-3.5" /> Blok toevoegen aan container
          </summary>
          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {NON_CONTAINER_PALETTE.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => addChild(t)}
                className="rounded-md border border-border bg-card px-2 py-1.5 text-left text-xs hover:bg-accent"
                title={BLOCK_DESCRIPTIONS[t]}
              >
                {BLOCK_LABELS[t]}
              </button>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}

function previewLabel(b: NonContainerBlock): string {
  if ("heading" in b && b.heading) return b.heading;
  if (b.type === "text") return b.body.slice(0, 60);
  if (b.type === "button") return b.label;
  if (b.type === "quote") return b.quote.slice(0, 60);
  if (b.type === "spacer") return `Witruimte ${b.size}`;
  return BLOCK_LABELS[b.type];
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Toggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-md border border-border bg-background p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            value === opt.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-3.5 rounded border-border accent-primary"
      />
      {label}
    </label>
  );
}
