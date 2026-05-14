"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ImageIcon } from "lucide-react";
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

  // Re-sync if parent data changes (e.g. category list shrinks to one).
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

  if (step === "category") {
    return (
      <div>
        <h2 className="text-sm font-semibold tracking-tight">Kies een categorie</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {categories.map((cat) => (
            <li key={cat.id}>
              <button
                type="button"
                onClick={() => {
                  setCategoryId(cat.id);
                  setStep("item");
                }}
                className="group flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{cat.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {cat.items.length} item{cat.items.length === 1 ? "" : "s"}
                  </p>
                </div>
                <span
                  className="text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ color: accent }}
                >
                  Kies →
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (step === "item" && selectedCategory) {
    return (
      <div>
        {categories.length > 1 && (
          <button
            type="button"
            onClick={() => {
              setStep("category");
              setItemId(null);
            }}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" />
            Andere categorie
          </button>
        )}
        <h2 className="mt-2 text-sm font-semibold tracking-tight">
          Wat wil je boeken?
        </h2>
        <p className="text-[11px] text-muted-foreground">{selectedCategory.name}</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {selectedCategory.items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  setItemId(item.id);
                  setStep("form");
                }}
                className="group flex w-full items-stretch gap-3 overflow-hidden rounded-lg border border-border bg-card text-left transition-shadow hover:shadow-sm"
              >
                <div className="grid size-16 shrink-0 place-items-center bg-muted">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="size-5 text-muted-foreground/60" />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center py-1.5 pr-3">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {priceLabel(item)}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (step === "form" && selectedItem) {
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            setItemId(null);
            setStep("item");
          }}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          Ander item
        </button>
        <h2 className="mt-2 text-sm font-semibold tracking-tight">
          Boek {selectedItem.name}
        </h2>
        <div className="mt-3">
          <PublicBookingForm
            slug={slug}
            orgName={orgName}
            accent={accent}
            fixedItem={{
              id: selectedItem.id,
              name: selectedItem.name,
              pricePerHour: selectedItem.pricePerHour,
              pricePerDay: selectedItem.pricePerDay,
            }}
          />
        </div>
      </div>
    );
  }

  return null;
}

function priceLabel(item: ItemRow): string {
  if (item.pricePerDay) return `Vanaf € ${item.pricePerDay.toFixed(2)} per dag`;
  if (item.pricePerHour) return `Vanaf € ${item.pricePerHour.toFixed(2)} per uur`;
  return "Prijs op aanvraag";
}
