"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/dashboard/ImageUploader";
// Plus and Trash2 are referenced by the new gallery + faq editors below
import { ICON_KEYS, type Block } from "@/lib/pages/blocks";

type CategoryRef = { id: string; name: string; parentId: string | null };

export function BlockEditor({
  block,
  onChange,
  categories,
}: {
  block: Block;
  onChange: (patch: Partial<Block>) => void;
  categories: CategoryRef[];
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

    case "priceTable":
      return (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Heading">
              <Input
                value={block.heading}
                maxLength={160}
                onChange={(e) => onChange({ heading: e.target.value } as Partial<Block>)}
              />
            </Field>
            <Field label="Kolommen">
              <Toggle
                value={String(block.columns) as "2" | "3"}
                onChange={(v) => onChange({ columns: Number(v) as 2 | 3 } as Partial<Block>)}
                options={[
                  { value: "2", label: "2" },
                  { value: "3", label: "3" },
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
          <div className="flex flex-col gap-3">
            {block.tiers.map((tier, i) => (
              <div
                key={i}
                className="rounded-md border border-border bg-background/40 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Plan {i + 1}
                  </span>
                  {block.tiers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...block.tiers];
                        next.splice(i, 1);
                        onChange({ tiers: next } as Partial<Block>);
                      }}
                      className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Verwijder"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    value={tier.name}
                    maxLength={60}
                    placeholder="Naam (bv. Pro)"
                    onChange={(e) => {
                      const next = [...block.tiers];
                      next[i] = { ...next[i], name: e.target.value };
                      onChange({ tiers: next } as Partial<Block>);
                    }}
                  />
                  <Input
                    value={tier.price}
                    maxLength={40}
                    placeholder="€49"
                    onChange={(e) => {
                      const next = [...block.tiers];
                      next[i] = { ...next[i], price: e.target.value };
                      onChange({ tiers: next } as Partial<Block>);
                    }}
                  />
                  <Input
                    value={tier.period}
                    maxLength={40}
                    placeholder="per maand"
                    onChange={(e) => {
                      const next = [...block.tiers];
                      next[i] = { ...next[i], period: e.target.value };
                      onChange({ tiers: next } as Partial<Block>);
                    }}
                  />
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={tier.highlighted}
                      onChange={(e) => {
                        const next = block.tiers.map((t, j) => ({
                          ...t,
                          highlighted: j === i ? e.target.checked : false,
                        }));
                        onChange({ tiers: next } as Partial<Block>);
                      }}
                    />
                    Aanbevolen plan
                  </label>
                </div>
                <Textarea
                  className="mt-2"
                  value={tier.features.join("\n")}
                  rows={4}
                  placeholder="Eén feature per regel"
                  onChange={(e) => {
                    const next = [...block.tiers];
                    next[i] = {
                      ...next[i],
                      features: e.target.value
                        .split("\n")
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .slice(0, 8),
                    };
                    onChange({ tiers: next } as Partial<Block>);
                  }}
                />
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Input
                    value={tier.buttonText}
                    maxLength={40}
                    placeholder="Knop-tekst"
                    onChange={(e) => {
                      const next = [...block.tiers];
                      next[i] = { ...next[i], buttonText: e.target.value };
                      onChange({ tiers: next } as Partial<Block>);
                    }}
                  />
                  <Input
                    value={tier.buttonHref}
                    maxLength={200}
                    placeholder="/contact"
                    onChange={(e) => {
                      const next = [...block.tiers];
                      next[i] = { ...next[i], buttonHref: e.target.value };
                      onChange({ tiers: next } as Partial<Block>);
                    }}
                  />
                </div>
              </div>
            ))}
            {block.tiers.length < 4 && (
              <button
                type="button"
                onClick={() =>
                  onChange({
                    tiers: [
                      ...block.tiers,
                      {
                        name: "",
                        price: "",
                        period: "",
                        features: [],
                        buttonText: "",
                        buttonHref: "",
                        highlighted: false,
                      },
                    ],
                  } as Partial<Block>)
                }
                className="inline-flex items-center justify-center gap-1 rounded-md border border-dashed border-border py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Plus className="size-3.5" /> Plan toevoegen
              </button>
            )}
          </div>
        </div>
      );

    case "testimonials":
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
        </div>
      );

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
  }
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
