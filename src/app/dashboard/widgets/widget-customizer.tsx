"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  GripVertical,
  Loader2,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { saveWidgetDesignAction } from "@/lib/widget/actions";
import { WIDGET_LOCALES, type WidgetLocale } from "@/lib/widget/i18n";

interface InitialDesign {
  accent: string;
  width: "400" | "600" | "800" | "100%";
  radius: number;
  shadow: boolean;
  usps: string[];
  tagline: string;
  defaultLocale: string;
}

interface Props {
  slug: string;
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
  const [usps, setUsps] = useState<string[]>(initialDesign.usps);
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

  const cleanUsps = usps.map((u) => u.trim()).filter(Boolean);

  const dirty =
    accent !== initialRef.current.accent ||
    radius !== initialRef.current.radius ||
    shadow !== initialRef.current.shadow ||
    tagline.trim() !== initialRef.current.tagline.trim() ||
    defaultLocale !== initialRef.current.defaultLocale ||
    cleanUsps.join("|") !==
      initialRef.current.usps.map((u) => u.trim()).filter(Boolean).join("|");

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
          };
          setSavedAt(Date.now());
        } else {
          toast.error(res.error ?? "Opslaan mislukt");
        }
      });
    }, 700);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accent, radius, shadow, tagline, defaultLocale, usps, dirty]);

  // Live voorbeeld = iframe van de échte /book pagina (1-op-1 design,
  // echte bedrijfsnaam). Preview-query overschrijft tijdelijk de
  // opgeslagen waarden zodat het meebeweegt vóór de save klaar is.
  const previewUrl = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("preview", "1");
    qs.set("accent", accent.replace(/^#/, ""));
    qs.set("radius", String(radius));
    qs.set("shadow", shadow ? "1" : "0");
    qs.set("tagline", tagline.trim());
    qs.set("usps", cleanUsps.map((u) => encodeURIComponent(u)).join("|"));
    qs.set("lang", defaultLocale);
    return `${shareUrl}?${qs.toString()}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accent, radius, shadow, tagline, usps, defaultLocale, shareUrl]);

  const [previewSrc, setPreviewSrc] = useState(previewUrl);
  useEffect(() => {
    const h = window.setTimeout(() => setPreviewSrc(previewUrl), 500);
    return () => window.clearTimeout(h);
  }, [previewUrl]);

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

  const updateUsp = (i: number, v: string) =>
    setUsps((prev) => prev.map((u, idx) => (idx === i ? v : u)));
  const removeUsp = (i: number) =>
    setUsps((prev) => prev.filter((_, idx) => idx !== i));
  const addUsp = () =>
    setUsps((prev) => (prev.length >= MAX_USPS ? prev : [...prev, ""]));

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
                <GripVertical className="size-3.5 shrink-0 text-muted-foreground/50" />
                <input
                  type="text"
                  value={u}
                  maxLength={60}
                  onChange={(e) => updateUsp(i, e.target.value)}
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

      {/* Voorbeeld — iframe van de échte /book pagina (0,0 afwijking) */}
      <div>
        <div className="sticky top-4">
          <div className="flex items-center justify-between pb-2">
            <h2 className="text-sm font-semibold">Live voorbeeld</h2>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <RefreshCw className="size-3" />
              exact zoals bezoekers het zien
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
            <iframe
              key={previewSrc}
              src={previewSrc}
              title="Widget voorbeeld"
              className="h-[760px] w-full bg-background"
            />
          </div>
        </div>
      </div>
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
