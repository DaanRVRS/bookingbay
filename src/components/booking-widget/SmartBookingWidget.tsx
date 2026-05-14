"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ImageIcon } from "lucide-react";
import { PublicBookingForm } from "./PublicBookingForm";

interface ItemRow {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  pricePerHour: number | null;
  pricePerDay: number | null;
}

interface CategoryBucket {
  id: string;
  name: string;
  items: ItemRow[];
}

interface Props {
  slug: string;
  orgName: string;
  accent: string;
  categories: CategoryBucket[];
}

type Step = "category" | "item" | "form";

export function SmartBookingWidget({ slug, orgName, accent, categories }: Props) {
  const onlyCategory = categories.length === 1 ? categories[0] : null;
  const [step, setStep] = useState<Step>(onlyCategory ? "item" : "category");
  const [categoryId, setCategoryId] = useState<string | null>(onlyCategory?.id ?? null);
  const [itemId, setItemId] = useState<string | null>(null);

  useEffect(() => {
    if (categories.length === 1 && !categoryId) {
      setCategoryId(categories[0].id);
      setStep("item");
    }
  }, [categories, categoryId]);

  const selectedCategory = categories.find((c) => c.id === categoryId) ?? null;
  const selectedItem = selectedCategory?.items.find((i) => i.id === itemId) ?? null;

  if (categories.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center text-sm text-muted-foreground">
        Het aanbod wordt nog samengesteld.
      </div>
    );
  }

  // Progress steps: only show "Categorie" if there are multiple
  const showCategoryStep = categories.length > 1;
  const stepIndex = step === "category" ? 0 : step === "item" ? (showCategoryStep ? 1 : 0) : showCategoryStep ? 2 : 1;
  const totalSteps = showCategoryStep ? 3 : 2;

  return (
    <div>
      <ProgressIndicator
        accent={accent}
        currentIndex={stepIndex}
        labels={
          showCategoryStep
            ? ["Categorie", "Item", "Boeken"]
            : ["Item", "Boeken"]
        }
      />

      {step === "category" && (
        <CategoryStep
          accent={accent}
          categories={categories}
          onPick={(id) => {
            setCategoryId(id);
            setStep("item");
          }}
        />
      )}

      {step === "item" && selectedCategory && (
        <ItemStep
          accent={accent}
          category={selectedCategory}
          showBack={categories.length > 1}
          onBack={() => {
            setStep("category");
            setItemId(null);
          }}
          onPick={(id) => {
            setItemId(id);
            setStep("form");
          }}
        />
      )}

      {step === "form" && selectedItem && (
        <FormStep
          slug={slug}
          orgName={orgName}
          accent={accent}
          item={selectedItem}
          onBack={() => {
            setItemId(null);
            setStep("item");
          }}
        />
      )}
    </div>
  );
}

function ProgressIndicator({
  accent,
  currentIndex,
  labels,
}: {
  accent: string;
  currentIndex: number;
  labels: string[];
}) {
  return (
    <div className="mb-6 flex items-center gap-2">
      {labels.map((label, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className="grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold transition-all"
                style={{
                  background: done || active ? accent : "transparent",
                  color: done || active ? "#fff" : "var(--muted-foreground)",
                  border: done || active ? "none" : "1.5px solid var(--border)",
                }}
              >
                {done ? <Check className="size-3" /> : i + 1}
              </span>
              <span
                className="text-xs font-medium tracking-wide"
                style={{
                  color: active
                    ? accent
                    : done
                      ? "var(--foreground)"
                      : "var(--muted-foreground)",
                }}
              >
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              <div
                className="h-px flex-1 transition-all"
                style={{
                  background:
                    i < currentIndex ? accent : "var(--border)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CategoryStep({
  accent,
  categories,
  onPick,
}: {
  accent: string;
  categories: CategoryBucket[];
  onPick: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight">Waarmee kunnen we helpen?</h2>
      <p className="mt-1 text-sm text-muted-foreground">Kies een categorie om te beginnen.</p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {categories.map((cat) => {
          // Show preview image from first item with image
          const previewImage = cat.items.find((i) => i.imageUrl)?.imageUrl ?? null;
          return (
            <li key={cat.id}>
              <button
                type="button"
                onClick={() => onPick(cat.id)}
                className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border border-border bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{
                  borderColor: "var(--border)",
                }}
              >
                <span
                  aria-hidden
                  className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
                  style={{
                    background: `linear-gradient(135deg, ${accent}10 0%, transparent 60%)`,
                  }}
                />
                <div
                  className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted"
                  style={{
                    background: previewImage ? undefined : `${accent}15`,
                  }}
                >
                  {previewImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewImage}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="size-5" style={{ color: accent }} />
                  )}
                </div>
                <div className="relative min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold tracking-tight">{cat.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {cat.items.length} {cat.items.length === 1 ? "item" : "items"} beschikbaar
                  </p>
                </div>
                <ArrowRight
                  className="relative size-4 shrink-0 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                  style={{ color: accent }}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ItemStep({
  accent,
  category,
  showBack,
  onBack,
  onPick,
}: {
  accent: string;
  category: CategoryBucket;
  showBack: boolean;
  onBack: () => void;
  onPick: (id: string) => void;
}) {
  return (
    <div>
      {showBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          Andere categorie
        </button>
      )}
      <p
        className="text-[11px] font-semibold tracking-wider uppercase"
        style={{ color: accent }}
      >
        {category.name}
      </p>
      <h2 className="mt-1 text-lg font-semibold tracking-tight">Wat wil je boeken?</h2>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {category.items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onPick(item.id)}
              className="group flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                ) : (
                  <div className="grid size-full place-items-center text-muted-foreground">
                    <ImageIcon className="size-7 opacity-40" />
                  </div>
                )}
                <span
                  className="absolute right-2 top-2 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm backdrop-blur"
                  style={{ background: `${accent}E0` }}
                >
                  {priceLabelShort(item)}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3.5">
                <h3 className="text-sm font-semibold tracking-tight">{item.name}</h3>
                {item.description && (
                  <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                )}
                <span
                  className="mt-auto inline-flex items-center gap-1 pt-2 text-[11px] font-medium opacity-70 transition-opacity group-hover:opacity-100"
                  style={{ color: accent }}
                >
                  Boek dit item <ArrowRight className="size-3" />
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FormStep({
  slug,
  orgName,
  accent,
  item,
  onBack,
}: {
  slug: string;
  orgName: string;
  accent: string;
  item: ItemRow;
  onBack: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        Ander item
      </button>

      <div className="mb-5 flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
        <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt={item.name}
              className="size-full object-cover"
            />
          ) : (
            <div className="grid size-full place-items-center text-muted-foreground">
              <ImageIcon className="size-5 opacity-40" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-[10px] font-semibold tracking-wider uppercase"
            style={{ color: accent }}
          >
            Je boekt
          </p>
          <p className="truncate text-sm font-semibold tracking-tight">{item.name}</p>
        </div>
      </div>

      <PublicBookingForm
        slug={slug}
        orgName={orgName}
        accent={accent}
        fixedItem={{
          id: item.id,
          name: item.name,
          pricePerHour: item.pricePerHour,
          pricePerDay: item.pricePerDay,
        }}
      />
    </div>
  );
}

function priceLabelShort(item: ItemRow): string {
  if (item.pricePerDay) return `€${item.pricePerDay.toFixed(0)}/dag`;
  if (item.pricePerHour) return `€${item.pricePerHour.toFixed(0)}/uur`;
  return "Op aanvraag";
}
