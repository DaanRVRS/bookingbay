"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Globe,
  ImageIcon,
  Loader2,
  MapPin,
  Plus,
  User,
  Wallet,
  X,
} from "lucide-react";
import type { CSSProperties } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { saveWidgetDesignAction } from "@/lib/widget/actions";
import {
  WIDGET_LOCALES,
  makeT,
  normalizeLocale,
  type WidgetLocale,
  type Translator,
} from "@/lib/widget/i18n";
import {
  WIDGET_THEME_TOKENS,
  USP_ICON_KEYS,
  themeStyle,
  type WidgetTheme,
  type WidgetThemeKey,
  type WidgetUsp,
} from "@/lib/widget/theme";
import { UspIcon } from "@/components/booking-widget/usp-icons";

interface InitialDesign {
  accent: string;
  width: "400" | "600" | "800" | "100%";
  radius: number;
  shadow: boolean;
  usps: WidgetUsp[];
  tagline: string;
  defaultLocale: string;
  theme: WidgetTheme;
}

interface Props {
  slug: string;
  orgName: string;
  logoUrl: string | null;
  publicEmbedKey: string;
  initialDesign: InitialDesign;
  defaultAccent: string;
  scriptBaseUrl: string;
  previewBaseUrl: string;
  shareBaseUrl: string;
}

const RADIUS_OPTIONS = [
  { id: 0, label: "Geen" },
  { id: 8, label: "Klein" },
  { id: 16, label: "Groot" },
];

const MAX_USPS = 6;

export function WidgetCustomizer({
  slug,
  orgName,
  logoUrl,
  publicEmbedKey,
  initialDesign,
  defaultAccent,
  scriptBaseUrl,
  shareBaseUrl,
}: Props) {
  const [accent, setAccent] = useState(initialDesign.accent);
  const [radius, setRadius] = useState<number>(initialDesign.radius);
  const [shadow, setShadow] = useState(initialDesign.shadow);
  const [tagline, setTagline] = useState(initialDesign.tagline);
  const [usps, setUsps] = useState<WidgetUsp[]>(initialDesign.usps);
  const [theme, setTheme] = useState<WidgetTheme>(initialDesign.theme);
  const [defaultLocale, setDefaultLocale] = useState(
    initialDesign.defaultLocale,
  );
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const initialRef = useRef(initialDesign);

  const shareUrl = `${shareBaseUrl}/book/${slug}`;
  const snippet = `<div data-bookingbay-book="${publicEmbedKey}"></div>\n<script src="${scriptBaseUrl}/embed.js" defer></script>`;

  const cleanUsps = usps
    .map((u) => ({ text: u.text.trim(), icon: u.icon }))
    .filter((u) => u.text.length > 0);

  const sig = (
    u: WidgetUsp[] = [],
    th: WidgetTheme = {},
  ) =>
    JSON.stringify([
      u.map((x) => `${x.text.trim()}|${x.icon}`),
      Object.entries(th)
        .filter(([, v]) => v)
        .sort(),
    ]);

  const dirty =
    accent !== initialRef.current.accent ||
    radius !== initialRef.current.radius ||
    shadow !== initialRef.current.shadow ||
    tagline.trim() !== initialRef.current.tagline.trim() ||
    defaultLocale !== initialRef.current.defaultLocale ||
    sig(cleanUsps, theme) !==
      sig(
        initialRef.current.usps
          .map((u) => ({ text: u.text.trim(), icon: u.icon }))
          .filter((u) => u.text.length > 0),
        initialRef.current.theme,
      );

  // Auto-save (700ms debounce). Breedte is altijd "100%" → de widget is
  // responsive en past zich aan de host-container aan.
  useEffect(() => {
    if (!dirty) return;
    const handle = window.setTimeout(() => {
      startTransition(async () => {
        const res = await saveWidgetDesignAction({
          accent: accent || null,
          width: "100%",
          radius,
          shadow,
          usps: cleanUsps,
          tagline: tagline.trim() || null,
          defaultLocale: defaultLocale as WidgetLocale,
          theme,
        });
        if (res.ok) {
          initialRef.current = {
            accent,
            width: "100%",
            radius,
            shadow,
            usps: cleanUsps,
            tagline: tagline.trim(),
            defaultLocale,
            theme,
          };
          setSavedAt(Date.now());
        } else {
          toast.error(res.error ?? "Opslaan mislukt");
        }
      });
    }, 700);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accent, radius, shadow, tagline, defaultLocale, usps, theme, dirty]);

  const copyText = (
    text: string,
    setter: (v: boolean) => void,
    label: string,
  ) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setter(true);
        toast.success(`${label} gekopieerd`);
        setTimeout(() => setter(false), 1500);
      },
      () => toast.error("Kopiëren mislukt"),
    );
  };

  const updateUspText = (i: number, v: string) =>
    setUsps((prev) =>
      prev.map((u, idx) => (idx === i ? { ...u, text: v } : u)),
    );
  const updateUspIcon = (i: number, icon: string) =>
    setUsps((prev) =>
      prev.map((u, idx) => (idx === i ? { ...u, icon } : u)),
    );
  const removeUsp = (i: number) =>
    setUsps((prev) => prev.filter((_, idx) => idx !== i));
  const addUsp = () =>
    setUsps((prev) =>
      prev.length >= MAX_USPS ? prev : [...prev, { text: "", icon: "check" }],
    );

  const setThemeColor = (key: WidgetThemeKey, hex: string) =>
    setTheme((prev) => ({ ...prev, [key]: hex }));
  const resetThemeColor = (key: WidgetThemeKey) =>
    setTheme((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
      {/* Opties */}
      <div className="space-y-5">
        {/* Embed-code — staat bewust bovenaan: dit is wat de gebruiker nodig
            heeft om de widget op zijn site te zetten. Alle styling daaronder. */}
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Embed-code</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Plak deze HTML op je eigen site (WordPress, Wix, Squarespace,
              eigen HTML). Eén regel — alle styling beheer je hieronder.
            </p>
          </div>
          <div className="bg-[oklch(0.18_0.01_260)]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
              <span className="text-[11px] font-medium tracking-wide text-white/55 uppercase">
                HTML
              </span>
              <button
                type="button"
                onClick={() => copyText(snippet, setCopiedSnippet, "Code")}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-white/20"
              >
                {copiedSnippet ? (
                  <>
                    <Check className="size-3.5 text-[oklch(0.78_0.16_150)]" />
                    Gekopieerd
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    Kopieer
                  </>
                )}
              </button>
            </div>
            <pre className="max-w-full overflow-x-auto px-4 py-3.5 text-[11px] leading-relaxed text-white">
              <code>{snippet}</code>
            </pre>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Direct te delen link</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Voor WhatsApp, e-mailhandtekening of Instagram-bio. Geen embed
            nodig.
          </p>
          <div className="mt-3 flex items-center gap-1 rounded-lg border border-border bg-muted/40 px-3 py-2">
            <code className="min-w-0 flex-1 truncate text-xs">{shareUrl}</code>
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-[11px] font-medium hover:bg-accent"
            >
              <ExternalLink className="size-3" />
              Open
            </a>
            <button
              type="button"
              onClick={() => copyText(shareUrl, setCopiedLink, "Link")}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-[11px] font-medium hover:bg-accent"
            >
              {copiedLink ? (
                <>
                  <Check className="size-3 text-[oklch(0.5_0.14_150)]" />
                  OK
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  Kopieer
                </>
              )}
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Stijl</h2>
            <SaveStatus pending={pending} dirty={dirty} savedAt={savedAt} />
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <div>
              <Label htmlFor="accent" className="text-xs">
                Accentkleur
              </Label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  id="accent"
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="size-9 cursor-pointer rounded-md border border-border bg-background p-0.5"
                />
                <input
                  type="text"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="h-9 flex-1 rounded-md border border-border bg-background px-2 text-xs font-mono uppercase"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setAccent(defaultAccent)}
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  Reset
                </button>
              </div>
            </div>

            <div>
              <Label className="text-xs">Hoekradius</Label>
              <SegmentedControl
                value={String(radius)}
                onChange={(v) => setRadius(Number(v))}
                options={RADIUS_OPTIONS.map((o) => ({
                  id: String(o.id),
                  label: o.label,
                }))}
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border bg-background px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={shadow}
                onChange={(e) => setShadow(e.target.checked)}
                className="size-4"
              />
              Schaduw rondom widget
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Kleuren</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Stel elk onderdeel apart in. Leeg = standaard. Klik op de kleur
            om te kiezen, of op &quot;Standaard&quot; om terug te zetten.
          </p>
          <div className="mt-3 flex flex-col divide-y divide-border">
            {WIDGET_THEME_TOKENS.map((tk) => (
              <ColorRow
                key={tk.key}
                label={tk.label}
                hint={tk.hint}
                value={theme[tk.key]}
                onChange={(hex) => setThemeColor(tk.key, hex)}
                onReset={() => resetThemeColor(tk.key)}
              />
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Tekst & taal</h2>

          <div className="mt-4 flex flex-col gap-4">
            <div>
              <Label htmlFor="tagline" className="text-xs">
                Subkop (onder je bedrijfsnaam)
              </Label>
              <input
                id="tagline"
                type="text"
                value={tagline}
                maxLength={80}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Bv. Verhuur in hartje Amsterdam"
                className="mt-1.5 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Optioneel. Laat leeg om niets te tonen.
              </p>
            </div>

            <div>
              <Label htmlFor="lang" className="text-xs">
                Standaardtaal van de widget
              </Label>
              <select
                id="lang"
                value={defaultLocale}
                onChange={(e) => setDefaultLocale(e.target.value)}
                className="mt-1.5 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm"
              >
                {WIDGET_LOCALES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Bezoekers kunnen zelf wisselen via de wereldbol in de widget.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">USP&apos;s onderaan de widget</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Korte verkooppunten met een vinkje, bv. &quot;Gratis
            annuleren&quot; of &quot;Direct bevestigd&quot;. Max {MAX_USPS}.
          </p>

          <div className="mt-3 flex flex-col gap-2">
            {usps.length === 0 && (
              <p className="rounded-md border border-dashed border-border px-3 py-3 text-center text-xs text-muted-foreground">
                Nog geen USP&apos;s toegevoegd.
              </p>
            )}
            {usps.map((u, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="relative shrink-0">
                  <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
                    <UspIcon icon={u.icon} className="size-4 text-foreground" />
                  </span>
                  <select
                    aria-label="Icoon"
                    value={u.icon}
                    onChange={(e) => updateUspIcon(i, e.target.value)}
                    className="h-9 w-16 appearance-none rounded-md border border-border bg-background pl-7 pr-1 text-xs"
                  >
                    {USP_ICON_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={u.text}
                  maxLength={60}
                  onChange={(e) => updateUspText(i, e.target.value)}
                  placeholder={`USP ${i + 1}`}
                  className="h-9 flex-1 rounded-md border border-border bg-background px-2.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeUsp(i)}
                  aria-label="Verwijder USP"
                  className="grid size-9 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>

          {usps.length < MAX_USPS && (
            <button
              type="button"
              onClick={addUsp}
              className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium transition-colors hover:bg-accent"
            >
              <Plus className="size-3.5" />
              USP toevoegen
            </button>
          )}
        </section>

        <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
          De widget is responsive — hij past zich automatisch aan de breedte
          van je site aan. Wijzigingen worden automatisch opgeslagen en zijn
          overal live waar de widget al staat.
        </p>
      </div>

      {/* Voorbeeld — klikbare stappen, exact dezelfde layout als /book */}
      <div>
        <div className="sticky top-4">
          <div className="flex items-center justify-between pb-2">
            <h2 className="text-sm font-semibold">Voorbeeld</h2>
            <span className="text-[11px] text-muted-foreground">
              klik de stappen om elke schermweergave te zien
            </span>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
            <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-2.5">
              <span className="size-2.5 rounded-full bg-[oklch(0.7_0.17_25)]" />
              <span className="size-2.5 rounded-full bg-[oklch(0.8_0.13_85)]" />
              <span className="size-2.5 rounded-full bg-[oklch(0.7_0.13_150)]" />
              <span className="ml-3 flex-1 truncate rounded-md bg-background px-3 py-1 text-center text-[10px] text-muted-foreground">
                🔒 {shareUrl.replace(/^https?:\/\//, "")}
              </span>
            </div>
            <div className="p-4 sm:p-6">
              <WidgetPreview
                orgName={orgName}
                logoUrl={logoUrl}
                accent={accent}
                radius={radius}
                shadow={shadow}
                tagline={tagline.trim()}
                usps={cleanUsps}
                locale={defaultLocale}
                theme={theme}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* Voorbeeld — statische, klikbare replica van de échte /book widget.     */
/* Zelfde markup/classes als SmartBookingWidget + PublicBookingForm zodat */
/* de layout 0,0 afwijkt; alleen de inhoud is voorbeeld-data.             */
/* --------------------------------------------------------------------- */

const PREVIEW_CATS = [
  { name: "Boten", n: 6 },
  { name: "Fietsen", n: 12 },
  { name: "Tenten", n: 4 },
  { name: "Gereedschap", n: 9 },
];
const PREVIEW_ITEMS = [
  { name: "Sloep Classic", price: "120", desc: "8 personen · incl. zwemtrap" },
  { name: "Kano duo", price: "45", desc: "2 personen · incl. peddels" },
];

const PREVIEW_ORG_NAME = "var(--bb-orgname, var(--foreground))";
const PREVIEW_ON_ACCENT = "var(--bb-on-accent, #fff)";
const previewItemLink = (accent: string) => `var(--bb-item-link, ${accent})`;

function WidgetPreview({
  orgName,
  logoUrl,
  accent,
  radius,
  shadow,
  tagline,
  usps,
  locale,
  theme,
}: {
  orgName: string;
  logoUrl: string | null;
  accent: string;
  radius: number;
  shadow: boolean;
  tagline: string;
  usps: WidgetUsp[];
  locale: string;
  theme: WidgetTheme;
}) {
  const t = useMemo<Translator>(
    () => makeT(normalizeLocale(locale)),
    [locale],
  );
  const loc = WIDGET_LOCALES.find(
    (l) => l.code === normalizeLocale(locale),
  )!;
  const [step, setStep] = useState(0);
  const labels = [
    t("progress.category"),
    t("progress.item"),
    t("progress.book"),
  ];

  return (
    <div className="mx-auto max-w-md" style={themeStyle(theme) as CSSProperties}>
      <div
        className="border border-border bg-card p-6 sm:p-8"
        style={{
          borderRadius: `${radius}px`,
          boxShadow: shadow
            ? "0 8px 30px -12px rgba(0,0,0,0.10)"
            : undefined,
        }}
      >
        {/* Merk-header (replica van BrandHeader) */}
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={orgName}
                className="size-10 shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-border"
              />
            ) : (
              <div
                className="grid size-10 shrink-0 place-items-center rounded-xl text-sm font-bold shadow-sm"
                style={{
                  background: accent,
                  color: PREVIEW_ON_ACCENT,
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
                style={{ color: PREVIEW_ORG_NAME }}
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
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
            <Globe className="size-3.5" />
            <span className="uppercase">{loc.code}</span>
          </span>
        </div>

        {/* Voortgang (replica van ProgressIndicator, klikbaar) */}
        <div className="mb-6 flex items-center gap-2">
          {labels.map((label, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div key={label} className="flex flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  className="flex items-center gap-2"
                >
                  <span
                    className="grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold transition-all"
                    style={{
                      background: done || active ? accent : "transparent",
                      color:
                        done || active
                          ? PREVIEW_ON_ACCENT
                          : "var(--muted-foreground)",
                      border:
                        done || active
                          ? "none"
                          : "1.5px solid var(--border)",
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
                </button>
                {i < labels.length - 1 && (
                  <div
                    className="h-px flex-1 transition-all"
                    style={{
                      background: i < step ? accent : "var(--border)",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {step === 0 && <PreviewCategory accent={accent} t={t} />}
        {step === 1 && <PreviewItem accent={accent} t={t} />}
        {step === 2 && <PreviewForm accent={accent} t={t} />}

        {/* USP-footer (replica van UspFooter) */}
        {usps.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-border pt-4 text-center">
            {usps.map((u, i) => (
              <span
                key={`${u.text}-${i}`}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"
              >
                <UspIcon
                  icon={u.icon}
                  className="size-3.5 shrink-0"
                  style={{ color: previewItemLink(accent) }}
                />
                {u.text}
              </span>
            ))}
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        Powered by <span className="font-medium">BookingBay</span>
      </p>
    </div>
  );
}

function PreviewCategory({
  accent,
  t,
}: {
  accent: string;
  t: Translator;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight">
        {t("cat.title")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("cat.subtitle")}
      </p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {PREVIEW_CATS.map((c, i) => (
          <li key={c.name}>
            <div
              className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border border-border bg-card p-3 text-left"
              style={
                i === 0
                  ? {
                      borderColor: `${accent}66`,
                      background: `${accent}08`,
                    }
                  : undefined
              }
            >
              <div
                className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted"
                style={{ background: `${accent}15` }}
              >
                <ImageIcon className="size-5" style={{ color: accent }} />
              </div>
              <div className="relative min-w-0 flex-1">
                <p className="truncate text-sm font-semibold tracking-tight">
                  {c.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t("cat.itemsAvailable", { n: c.n })}
                </p>
              </div>
              <ArrowRight
                className="relative size-4 shrink-0"
                style={{ color: accent }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PreviewItem({ accent, t }: { accent: string; t: Translator }) {
  return (
    <div>
      <div className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <ArrowLeft className="size-3" />
        {t("item.otherCategory")}
      </div>
      <p
        className="text-[11px] font-semibold tracking-wider uppercase"
        style={{ color: accent }}
      >
        {PREVIEW_CATS[0].name}
      </p>
      <h2 className="mt-1 text-lg font-semibold tracking-tight">
        {t("item.title")}
      </h2>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {PREVIEW_ITEMS.map((it, i) => (
          <li key={it.name}>
            <div className="group flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card text-left">
              <div className="relative aspect-[4/3] overflow-hidden">
                <div
                  className="size-full"
                  style={{ background: `${accent}${i === 0 ? "22" : "12"}` }}
                />
                <span
                  className="absolute right-2 top-2 rounded-full px-2.5 py-1 text-[10px] font-semibold shadow-sm backdrop-blur"
                  style={{ background: `${accent}E0`, color: PREVIEW_ON_ACCENT }}
                >
                  {t("price.perDay", { price: it.price })}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3.5">
                <h3 className="text-sm font-semibold tracking-tight">
                  {it.name}
                </h3>
                <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                  {it.desc}
                </p>
                <span
                  className="mt-auto inline-flex items-center gap-1 pt-2 text-[11px] font-medium"
                  style={{ color: previewItemLink(accent) }}
                >
                  {t("item.book")} <ArrowRight className="size-3" />
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PreviewSection({
  icon: Icon,
  title,
  accent,
  children,
}: {
  icon: typeof CalendarDays;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2">
        <span
          className="grid size-6 place-items-center rounded-md"
          style={{ background: `${accent}15`, color: accent }}
        >
          <Icon className="size-3.5" />
        </span>
        <span className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function PreviewForm({ accent, t }: { accent: string; t: Translator }) {
  return (
    <div className="flex flex-col gap-5">
      {/* Gekozen item (replica van FormStep-header) */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
        <div
          className="size-12 shrink-0 rounded-lg"
          style={{ background: `${accent}15` }}
        />
        <div className="min-w-0 flex-1">
          <p
            className="text-[10px] font-semibold tracking-wider uppercase"
            style={{ color: accent }}
          >
            {t("form.youBook")}
          </p>
          <p className="truncate text-sm font-semibold tracking-tight">
            {PREVIEW_ITEMS[0].name}
          </p>
        </div>
      </div>

      <PreviewSection icon={CalendarDays} title={t("sec.when")} accent={accent}>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/30 p-2">
          {[t("chip.from"), t("chip.to")].map((lbl) => (
            <div
              key={lbl}
              className="rounded-md border border-border bg-background px-3 py-2"
            >
              <p className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
                {lbl}
              </p>
              <p className="text-sm font-semibold tracking-tight">
                14 jun
                <span className="ml-1.5 text-xs font-normal text-muted-foreground tabular-nums">
                  · 10:00
                </span>
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl border border-border bg-card p-3">
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 28 }).map((_, i) => (
              <span
                key={i}
                className="grid aspect-square place-items-center rounded-md text-[10px] text-muted-foreground"
                style={
                  i === 13
                    ? { background: accent, color: PREVIEW_ON_ACCENT }
                    : i % 9 === 4
                      ? { background: "var(--muted)" }
                      : undefined
                }
              >
                {i + 1}
              </span>
            ))}
          </div>
        </div>
        <div
          className="mt-3 flex items-center justify-between gap-3 rounded-lg px-3.5 py-2.5"
          style={{ background: `${accent}0D`, border: `1px solid ${accent}33` }}
        >
          <div>
            <p className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
              {t("price.estimate")}
            </p>
            <p
              className="text-lg font-semibold leading-tight tabular-nums"
              style={{ color: accent }}
            >
              € 240,00
            </p>
          </div>
        </div>
      </PreviewSection>

      <PreviewSection icon={User} title={t("sec.you")} accent={accent}>
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-9 rounded-md border border-border bg-background" />
            <div className="h-9 rounded-md border border-border bg-background" />
          </div>
          <div className="h-9 rounded-md border border-border bg-background" />
          <div className="h-16 rounded-md border border-border bg-background" />
        </div>
      </PreviewSection>

      <PreviewSection icon={Wallet} title={t("sec.pay")} accent={accent}>
        <div className="grid gap-2 sm:grid-cols-2">
          <div
            className="flex flex-col gap-1.5 rounded-xl border p-3.5"
            style={{
              borderColor: accent,
              background: `${accent}0D`,
              boxShadow: `inset 0 0 0 1px ${accent}55`,
            }}
          >
            <span
              className="grid size-8 place-items-center rounded-md"
              style={{ background: accent, color: PREVIEW_ON_ACCENT }}
            >
              <MapPin className="size-4" />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              {t("pay.location")}
            </span>
            <span className="text-[11px] leading-relaxed text-muted-foreground">
              {t("pay.locationDesc")}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 rounded-xl border border-border p-3.5">
            <span
              className="grid size-8 place-items-center rounded-md"
              style={{ background: `${accent}15`, color: accent }}
            >
              <CreditCard className="size-4" />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              {t("pay.online")}
            </span>
            <span className="text-[11px] leading-relaxed text-muted-foreground">
              {t("pay.onlineDesc")}
            </span>
          </div>
        </div>
      </PreviewSection>

      <button
        type="button"
        className="group relative mt-2 inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-xl px-6 text-sm font-semibold shadow-sm"
        style={{
          background: accent,
          color: PREVIEW_ON_ACCENT,
          boxShadow: `0 4px 14px -4px ${accent}80`,
        }}
      >
        {t("submit.book")}
        <ArrowRight className="size-4" />
      </button>
      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        {t("submit.nextStep")}
      </p>
    </div>
  );
}

function ColorRow({
  label,
  hint,
  value,
  onChange,
  onReset,
}: {
  label: string;
  hint: string;
  value: string | undefined;
  onChange: (hex: string) => void;
  onReset: () => void;
}) {
  const isSet = Boolean(value);
  return (
    <div className="flex items-center gap-3 py-2.5">
      <label
        className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border"
        style={{
          background: isSet
            ? value
            : "repeating-conic-gradient(var(--muted) 0% 25%, transparent 0% 50%) 50% / 10px 10px",
        }}
      >
        <input
          type="color"
          value={value ?? "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label={label}
        />
      </label>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="truncate text-[11px] text-muted-foreground">{hint}</p>
      </div>
      {isSet ? (
        <button
          type="button"
          onClick={onReset}
          className="shrink-0 text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          Standaard
        </button>
      ) : (
        <span className="shrink-0 text-[11px] text-muted-foreground/60">
          Standaard
        </span>
      )}
    </div>
  );
}

function SaveStatus({
  pending,
  dirty,
  savedAt,
}: {
  pending: boolean;
  dirty: boolean;
  savedAt: number | null;
}) {
  if (pending) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Opslaan...
      </span>
    );
  }
  if (dirty) {
    return (
      <span className="text-[11px] text-muted-foreground">Wijzigingen…</span>
    );
  }
  if (savedAt) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-[oklch(0.5_0.14_150)]">
        <Check className="size-3" />
        Opgeslagen
      </span>
    );
  }
  return null;
}

function SegmentedControl({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <div className="mt-1.5 inline-flex w-full rounded-md border border-border bg-background p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
            value === o.id
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
