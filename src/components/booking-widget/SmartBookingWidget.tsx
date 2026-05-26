"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ImageIcon } from "lucide-react";
import { PublicBookingForm } from "./PublicBookingForm";
import {
  WidgetI18nProvider,
  LanguageSwitcher,
  useWidgetI18n,
} from "./widget-i18n";
import { UspIcon } from "./usp-icons";
import type { Translator } from "@/lib/widget/i18n";
import type { WidgetUsp } from "@/lib/widget/theme";

// Door themeStyle() op een ouder gezette CSS-vars; met nette fallbacks
// zodat niets verandert als de tenant geen kleur koos.
const ORG_NAME_COLOR = "var(--bb-orgname, var(--foreground))";
const ON_ACCENT = "var(--bb-on-accent, #fff)";
const itemLink = (accent: string) => `var(--bb-item-link, ${accent})`;

interface ItemRow {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  pricePerHour: number | null;
  pricePerDay: number | null;
  cleaningFee: number | null;
}

interface CategoryBucket {
  id: string;
  name: string;
  items: ItemRow[];
}

interface Props {
  slug: string;
  orgName: string;
  logoUrl?: string | null;
  accent: string;
  categories: CategoryBucket[];
  usps?: WidgetUsp[];
  tagline?: string | null;
  defaultLocale?: string;
}

type Step = "category" | "item" | "form";

export function SmartBookingWidget({
  slug,
  orgName,
  logoUrl,
  accent,
  categories,
  usps = [],
  tagline = null,
  defaultLocale = "nl",
}: Props) {
  return (
    <WidgetI18nProvider defaultLocale={defaultLocale}>
      <WidgetInner
        slug={slug}
        orgName={orgName}
        logoUrl={logoUrl ?? null}
        accent={accent}
        categories={categories}
        usps={usps}
        tagline={tagline}
      />
    </WidgetI18nProvider>
  );
}

function BrandHeader({
  orgName,
  logoUrl,
  tagline,
  accent,
}: {
  orgName: string;
  logoUrl: string | null;
  tagline: string | null;
  accent: string;
}) {
  const { t } = useWidgetI18n();
  return (
    <div className="mb-6 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={orgName}
            width={40}
            height={40}
            className="size-10 shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-border"
          />
        ) : (
          <div
            className="grid size-10 shrink-0 place-items-center rounded-xl text-sm font-bold text-white shadow-sm"
            style={{
              background: accent,
              boxShadow: `0 4px 14px -4px ${accent}80`,
            }}
          >
            {orgName.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p
            className="text-[10px] font-semibold tracking-wider uppercase"
            style={{ color: accent }}
          >
            {t("header.bookAt")}
          </p>
          <p
            className="truncate text-sm font-bold tracking-tight"
            style={{ color: ORG_NAME_COLOR }}
          >
            {orgName}
          </p>
          {tagline && (
            <p className="truncate text-[11px] text-muted-foreground">
              {tagline}
            </p>
          )}
        </div>
      </div>
      <LanguageSwitcher accent={accent} />
    </div>
  );
}

function UspFooter({ usps, accent }: { usps: WidgetUsp[]; accent: string }) {
  const clean = usps.filter((u) => u.text.trim());
  if (clean.length === 0) return null;
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-border pt-4 text-center">
      {clean.map((u, i) => (
        <span
          key={`${u.text}-${i}`}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"
        >
          <UspIcon
            icon={u.icon}
            className="size-3.5 shrink-0"
            style={{ color: itemLink(accent) }}
          />
          {u.text}
        </span>
      ))}
    </div>
  );
}

function WidgetInner({
  slug,
  orgName,
  logoUrl,
  accent,
  categories,
  usps,
  tagline,
}: {
  slug: string;
  orgName: string;
  logoUrl: string | null;
  accent: string;
  categories: CategoryBucket[];
  usps: WidgetUsp[];
  tagline: string | null;
}) {
  const { t } = useWidgetI18n();
  const onlyCategory = categories.length === 1 ? categories[0] : null;
  const [step, setStep] = useState<Step>(onlyCategory ? "item" : "category");
  const [categoryId, setCategoryId] = useState<string | null>(
    onlyCategory?.id ?? null,
  );
  const [itemId, setItemId] = useState<string | null>(null);
  const [formPhase, setFormPhase] = useState<
    "when" | "details" | "confirm"
  >("when");

  useEffect(() => {
    if (categories.length === 1 && !categoryId) {
      setCategoryId(categories[0].id);
      setStep("item");
    }
  }, [categories, categoryId]);

  const selectedCategory = categories.find((c) => c.id === categoryId) ?? null;
  const selectedItem =
    selectedCategory?.items.find((i) => i.id === itemId) ?? null;

  const brand = (
    <BrandHeader
      orgName={orgName}
      logoUrl={logoUrl}
      tagline={tagline}
      accent={accent}
    />
  );

  if (categories.length === 0) {
    return (
      <div>
        {brand}
        <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center text-sm text-muted-foreground">
          {t("empty.catalog")}
        </div>
        <UspFooter usps={usps} accent={accent} />
      </div>
    );
  }

  // Voortgang: bij meerdere categorieën 5 stappen, anders 4.
  // [Categorie?] → Item → Wanneer → Gegevens → Bevestiging
  const showCategoryStep = categories.length > 1;
  const prefixLabels = showCategoryStep
    ? [t("progress.category"), t("progress.item")]
    : [t("progress.item")];
  const labels = [
    ...prefixLabels,
    t("progress.when"),
    t("progress.details"),
    t("progress.confirm"),
  ];
  const prefixLen = prefixLabels.length;
  const stepIndex =
    step === "category"
      ? 0
      : step === "item"
        ? prefixLen - 1
        : prefixLen +
          (formPhase === "when" ? 0 : formPhase === "details" ? 1 : 2);

  return (
    <div>
      {brand}

      <ProgressIndicator
        accent={accent}
        currentIndex={stepIndex}
        labels={labels}
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
            setFormPhase("when");
          }}
          onPhaseChange={setFormPhase}
        />
      )}

      <UspFooter usps={usps} accent={accent} />
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
                  color: done || active ? ON_ACCENT : "var(--muted-foreground)",
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
                  background: i < currentIndex ? accent : "var(--border)",
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
  const { t } = useWidgetI18n();
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight">
        {t("cat.title")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("cat.subtitle")}
      </p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {categories.map((cat) => {
          const previewImage =
            cat.items.find((i) => i.imageUrl)?.imageUrl ?? null;
          return (
            <li key={cat.id}>
              <button
                type="button"
                onClick={() => onPick(cat.id)}
                className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border border-border bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{ borderColor: "var(--border)" }}
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
                  <p className="truncate text-sm font-semibold tracking-tight">
                    {cat.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {cat.items.length === 1
                      ? t("cat.itemAvailable", { n: cat.items.length })
                      : t("cat.itemsAvailable", { n: cat.items.length })}
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
  const { t } = useWidgetI18n();
  return (
    <div>
      {showBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          {t("item.otherCategory")}
        </button>
      )}
      <p
        className="text-[11px] font-semibold tracking-wider uppercase"
        style={{ color: accent }}
      >
        {category.name}
      </p>
      <h2 className="mt-1 text-lg font-semibold tracking-tight">
        {t("item.title")}
      </h2>

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
                  className="absolute right-2 top-2 rounded-full px-2.5 py-1 text-[10px] font-semibold shadow-sm backdrop-blur"
                  style={{ background: `${accent}E0`, color: ON_ACCENT }}
                >
                  {priceLabelShort(item, t)}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3.5">
                <h3 className="text-sm font-semibold tracking-tight">
                  {item.name}
                </h3>
                {item.description && (
                  <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                )}
                <span
                  className="mt-auto inline-flex items-center gap-1 pt-2 text-[11px] font-medium opacity-70 transition-opacity group-hover:opacity-100"
                  style={{ color: itemLink(accent) }}
                >
                  {t("item.book")} <ArrowRight className="size-3" />
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
  onPhaseChange,
}: {
  slug: string;
  orgName: string;
  accent: string;
  item: ItemRow;
  onBack: () => void;
  onPhaseChange?: (phase: "when" | "details" | "confirm") => void;
}) {
  const { t } = useWidgetI18n();
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        {t("form.otherItem")}
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
            {t("form.youBook")}
          </p>
          <p className="truncate text-sm font-semibold tracking-tight">
            {item.name}
          </p>
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
          cleaningFee: item.cleaningFee,
        }}
        onPhaseChange={onPhaseChange}
      />
    </div>
  );
}

function priceLabelShort(item: ItemRow, t: Translator): string {
  if (item.pricePerDay)
    return t("price.perDay", { price: item.pricePerDay.toFixed(0) });
  if (item.pricePerHour)
    return t("price.perHour", { price: item.pricePerHour.toFixed(0) });
  return t("price.onRequest");
}
