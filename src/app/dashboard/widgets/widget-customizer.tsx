"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Check, Copy, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { saveWidgetDesignAction } from "@/lib/widget/actions";

interface InitialDesign {
  accent: string;
  width: "400" | "600" | "800" | "100%";
  radius: number;
  shadow: boolean;
}

interface Props {
  slug: string;
  publicEmbedKey: string;
  initialDesign: InitialDesign;
  /** Org's primaryColor — gebruikt als reset-default voor accentkleur. */
  defaultAccent: string;
  /** e.g. "https://bookingbay.nl" — used for the script src */
  scriptBaseUrl: string;
  /** e.g. "https://acme.bookingbay.nl" — used for the live preview iframe */
  previewBaseUrl: string;
  /** e.g. "https://www.bookingbay.nl" — used for the deelbare directe link */
  shareBaseUrl: string;
}

const WIDTH_OPTIONS: { id: "400" | "600" | "800" | "100%"; label: string }[] = [
  { id: "400", label: "Compact (400)" },
  { id: "600", label: "Standaard (600)" },
  { id: "800", label: "Ruim (800)" },
  { id: "100%", label: "Volledig" },
];

const RADIUS_OPTIONS = [
  { id: 0, label: "Geen" },
  { id: 8, label: "Klein" },
  { id: 16, label: "Groot" },
];

export function WidgetCustomizer({
  slug,
  publicEmbedKey,
  initialDesign,
  defaultAccent,
  scriptBaseUrl,
  previewBaseUrl,
  shareBaseUrl,
}: Props) {
  const [accent, setAccent] = useState(initialDesign.accent);
  const [width, setWidth] = useState<"400" | "600" | "800" | "100%">(initialDesign.width);
  const [radius, setRadius] = useState<number>(initialDesign.radius);
  const [shadow, setShadow] = useState(initialDesign.shadow);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const initialRef = useRef(initialDesign);

  const accentForUrl = useMemo(() => accent.replace(/^#/, ""), [accent]);

  const previewUrl = `${previewBaseUrl}/embed/book?accent=${encodeURIComponent(
    accentForUrl,
  )}`;

  const shareUrl = `${shareBaseUrl}/book/${slug}`;

  // Snippet bevat alleen de key — design leeft server-side achter de key.
  const snippet = `<div data-bookingbay-book="${publicEmbedKey}"></div>\n<script src="${scriptBaseUrl}/embed.js" defer></script>`;

  const dirty =
    accent !== initialRef.current.accent ||
    width !== initialRef.current.width ||
    radius !== initialRef.current.radius ||
    shadow !== initialRef.current.shadow;

  // Auto-save: bij elke wijziging na 600ms zonder verdere wijzigingen
  // sturen we de update naar de server. Geen save-knop nodig.
  useEffect(() => {
    if (!dirty) return;
    const handle = window.setTimeout(() => {
      startTransition(async () => {
        const res = await saveWidgetDesignAction({
          accent: accent || null,
          width,
          radius,
          shadow,
        });
        if (res.ok) {
          initialRef.current = { accent, width, radius, shadow };
          setSavedAt(Date.now());
          // Refresh de preview-iframe zodat 'ie de nieuwe accent uit env oppakt.
          if (iframeRef.current) {
            iframeRef.current.src = previewUrl + "&_=" + Date.now();
          }
        } else {
          toast.error(res.error ?? "Opslaan mislukt");
        }
      });
    }, 600);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accent, width, radius, shadow, dirty]);

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

  const previewWrapperStyle: React.CSSProperties = {
    maxWidth: width === "100%" ? "100%" : `${width}px`,
    margin: "0 auto",
    borderRadius: `${radius}px`,
    overflow: "hidden",
    boxShadow: shadow
      ? "0 4px 20px -4px rgba(0,0,0,0.10), 0 2px 6px -2px rgba(0,0,0,0.06)"
      : undefined,
    transition: "all 150ms",
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      {/* Settings */}
      <div className="space-y-5">
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
              <Label className="text-xs">Breedte</Label>
              <SegmentedControl
                value={width}
                onChange={(v) => setWidth(v as typeof width)}
                options={WIDTH_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
              />
            </div>

            <div>
              <Label className="text-xs">Hoekradius</Label>
              <SegmentedControl
                value={String(radius)}
                onChange={(v) => setRadius(Number(v))}
                options={RADIUS_OPTIONS.map((o) => ({ id: String(o.id), label: o.label }))}
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

          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            Wijzigingen worden automatisch opgeslagen en zijn meteen overal
            live waar je widget al ingebed is.
          </p>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Embed-code</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Plak deze HTML op je eigen site (WordPress, Wix, Squarespace, eigen
            HTML). Eén regel — alle styling beheer je hier in het dashboard.
          </p>
          <div className="mt-3 overflow-hidden rounded-lg border border-border bg-muted/40">
            <div className="flex items-center justify-between border-b border-border bg-background/50 px-3 py-2">
              <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                HTML
              </span>
              <button
                type="button"
                onClick={() => copyText(snippet, setCopiedSnippet, "Code")}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent"
              >
                {copiedSnippet ? (
                  <>
                    <Check className="size-3.5 text-[oklch(0.5_0.14_150)]" />
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
            <pre className="max-w-full overflow-x-auto p-3 text-[11px] leading-relaxed text-foreground/90">
              <code>{snippet}</code>
            </pre>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Direct te delen link</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Voor WhatsApp, e-mailhandtekening of Instagram-bio. Geen embed nodig.
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
      </div>

      {/* Live preview */}
      <div>
        <div className="sticky top-4">
          <div className="flex items-center justify-between pb-2">
            <h2 className="text-sm font-semibold">Voorbeeld</h2>
            <span className="text-[11px] text-muted-foreground">
              live · update bij wijziging
            </span>
          </div>
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 sm:p-6">
            <div style={previewWrapperStyle}>
              <iframe
                ref={iframeRef}
                src={previewUrl}
                title="Widget voorbeeld"
                className="block w-full bg-background"
                style={{
                  border: 0,
                  minHeight: 600,
                  height: 600,
                }}
              />
            </div>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Echte interactie: klik door de stappen heen om je flow te testen.
            </p>
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
