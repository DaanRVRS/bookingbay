"use client";

import { useMemo, useRef, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

interface Props {
  slug: string;
  /** Stripe-style public embed-key (pk_xxx) — gebruikt in de snippet zodat
   *  externe sites de slug niet hoeven te kennen en de key revokebaar is. */
  publicEmbedKey: string;
  defaultAccent: string;
  /** e.g. "https://bookingbay.nl" — used for the script src */
  scriptBaseUrl: string;
  /** e.g. "https://acme.bookingbay.nl" — used for the live preview iframe */
  previewBaseUrl: string;
  /** e.g. "https://www.bookingbay.nl" — used for the deelbare directe link */
  shareBaseUrl: string;
}

const WIDTH_OPTIONS = [
  { id: "400", label: "Compact (400)" },
  { id: "600", label: "Standaard (600)" },
  { id: "800", label: "Ruim (800)" },
  { id: "100%", label: "Volledig" },
];

const RADIUS_OPTIONS = [
  { id: "0", label: "Geen" },
  { id: "8", label: "Klein" },
  { id: "16", label: "Groot" },
];

export function WidgetCustomizer({
  slug,
  publicEmbedKey,
  defaultAccent,
  scriptBaseUrl,
  previewBaseUrl,
  shareBaseUrl,
}: Props) {
  const [accent, setAccent] = useState(defaultAccent);
  const [width, setWidth] = useState<string>("600");
  const [radius, setRadius] = useState<string>("8");
  const [shadow, setShadow] = useState(true);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const accentForUrl = useMemo(() => accent.replace(/^#/, ""), [accent]);

  const previewUrl = `${previewBaseUrl}/embed/book?accent=${encodeURIComponent(
    accentForUrl,
  )}`;

  const shareUrl = `${shareBaseUrl}/book/${slug}?accent=${encodeURIComponent(
    accentForUrl,
  )}`;

  const snippet = buildSnippet({
    embedKey: publicEmbedKey,
    accent: accentForUrl,
    width,
    radius,
    shadow,
    scriptBaseUrl,
  });

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

  // Wrapper styles to mimic embed.js applyHostStyles in the preview
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
          <h2 className="text-sm font-semibold">Stijl</h2>

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
                onChange={setWidth}
                options={WIDTH_OPTIONS}
              />
            </div>

            <div>
              <Label className="text-xs">Hoekradius</Label>
              <SegmentedControl
                value={radius}
                onChange={setRadius}
                options={RADIUS_OPTIONS}
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
          <h2 className="text-sm font-semibold">Embed-code</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Plak deze HTML op je eigen site (WordPress, Wix, Squarespace, eigen HTML).
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

function buildSnippet({
  embedKey,
  accent,
  width,
  radius,
  shadow,
  scriptBaseUrl,
}: {
  embedKey: string;
  accent: string;
  width: string;
  radius: string;
  shadow: boolean;
  scriptBaseUrl: string;
}): string {
  const attrs = [`data-bookingbay-book="${embedKey}"`];
  if (accent) attrs.push(`data-bookingbay-accent="#${accent}"`);
  if (width !== "600") attrs.push(`data-bookingbay-width="${width}"`);
  if (radius !== "8") attrs.push(`data-bookingbay-radius="${radius}"`);
  if (shadow) attrs.push(`data-bookingbay-shadow="1"`);
  return `<div ${attrs.join("\n     ")}></div>\n<script src="${scriptBaseUrl}/embed.js" defer></script>`;
}
