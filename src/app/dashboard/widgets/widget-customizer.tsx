"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Calendar,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Loader2,
  MapPin,
  Package,
  User,
} from "lucide-react";
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
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const initialRef = useRef(initialDesign);

  const shareUrl = `${shareBaseUrl}/book/${slug}`;
  const snippet = `<div data-bookingbay-book="${publicEmbedKey}"></div>\n<script src="${scriptBaseUrl}/embed.js" defer></script>`;

  const dirty =
    accent !== initialRef.current.accent ||
    radius !== initialRef.current.radius ||
    shadow !== initialRef.current.shadow;

  // Auto-save (600ms debounce). Breedte is altijd "100%" → de widget is
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
        });
        if (res.ok) {
          initialRef.current = { accent, width: "100%", radius, shadow };
          setSavedAt(Date.now());
        } else {
          toast.error(res.error ?? "Opslaan mislukt");
        }
      });
    }, 600);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accent, radius, shadow, dirty]);

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

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      {/* Settings */}
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

          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            De widget is responsive — hij past zich automatisch aan de breedte
            van je site aan. Wijzigingen worden direct opgeslagen en zijn
            overal live waar de widget al staat.
          </p>
        </section>
      </div>

      {/* Voorbeeld — statische mockup, klik de stappen om te zien hoe het oogt */}
      <div>
        <div className="sticky top-4">
          <div className="flex items-center justify-between pb-2">
            <h2 className="text-sm font-semibold">Voorbeeld</h2>
            <span className="text-[11px] text-muted-foreground">
              klik de stappen om te zien hoe het verandert
            </span>
          </div>
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 sm:p-8">
            <WidgetMock accent={accent} radius={radius} shadow={shadow} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* Statische, klikbare preview-mockup — géén echte boeking, puur visueel  */
/* --------------------------------------------------------------------- */

const STEPS = [
  { id: 0, label: "Categorie", icon: Package },
  { id: 1, label: "Item", icon: Package },
  { id: 2, label: "Gegevens", icon: User },
  { id: 3, label: "Betalen", icon: CreditCard },
] as const;

function WidgetMock({
  accent,
  radius,
  shadow,
}: {
  accent: string;
  radius: number;
  shadow: boolean;
}) {
  const [step, setStep] = useState(0);

  return (
    <div
      className="mx-auto max-w-md overflow-hidden border border-border bg-background"
      style={{
        borderRadius: `${radius}px`,
        boxShadow: shadow
          ? "0 18px 50px -20px rgba(0,0,0,0.22), 0 4px 12px -4px rgba(0,0,0,0.10)"
          : undefined,
      }}
    >
      {/* Browserbalk */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-[oklch(0.7_0.17_25)]" />
        <span className="size-2.5 rounded-full bg-[oklch(0.8_0.13_85)]" />
        <span className="size-2.5 rounded-full bg-[oklch(0.7_0.13_150)]" />
        <span className="ml-3 flex-1 truncate rounded-md bg-background px-3 py-1 text-center text-[10px] text-muted-foreground">
          🔒 jouwsite.nl/boeken
        </span>
      </div>

      <div className="p-5">
        {/* Merk-rij */}
        <div className="flex items-start justify-between">
          <div>
            <p
              className="text-[10px] font-bold tracking-[0.18em] uppercase"
              style={{ color: accent }}
            >
              Boek direct
            </p>
            <p className="mt-0.5 text-xl font-bold tracking-tight">
              Jouw bedrijf
            </p>
          </div>
          <div
            className="grid size-10 place-items-center rounded-lg text-sm font-bold text-white"
            style={{ background: accent }}
          >
            JB
          </div>
        </div>

        {/* Voortgangsbalk */}
        <div className="mt-4 flex gap-1.5">
          {STEPS.map((s) => (
            <span
              key={s.id}
              className="h-1.5 flex-1 rounded-full transition-colors"
              style={{
                background:
                  s.id <= step ? accent : "var(--muted)",
              }}
            />
          ))}
        </div>

        {/* Klikbare stap-tabs */}
        <div className="mt-4 grid grid-cols-4 gap-1.5">
          {STEPS.map((s) => {
            const active = s.id === step;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id)}
                className="rounded-lg border px-1 py-2 text-center transition-all"
                style={{
                  borderColor: active ? accent : "var(--border)",
                  background: active ? `${accent}14` : "transparent",
                }}
              >
                <span
                  className="block text-[10px] font-semibold"
                  style={{ color: active ? accent : "var(--muted-foreground)" }}
                >
                  {s.id + 1}. {s.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Stap-inhoud (representatief, niet functioneel) */}
        <div className="mt-5 min-h-[210px]">
          {step === 0 && <MockCategory accent={accent} />}
          {step === 1 && <MockItem accent={accent} />}
          {step === 2 && <MockDetails accent={accent} />}
          {step === 3 && <MockPay accent={accent} />}
        </div>

        {/* Primaire knop */}
        <button
          type="button"
          onClick={() => setStep((s) => (s + 1) % STEPS.length)}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: accent }}
        >
          {step < 3 ? "Volgende stap" : "Boeking bevestigen"}
        </button>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Mogelijk gemaakt door BookingBay
        </p>
      </div>
    </div>
  );
}

function MockLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
      {children}
    </p>
  );
}

function MockCategory({ accent }: { accent: string }) {
  return (
    <div>
      <MockLabel>Kies een categorie</MockLabel>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {["Boten", "Fietsen", "Gereedschap", "Tenten"].map((c, i) => (
          <div
            key={c}
            className="flex items-center gap-2 rounded-lg border px-3 py-3"
            style={{
              borderColor: i === 0 ? accent : "var(--border)",
              background: i === 0 ? `${accent}10` : "transparent",
            }}
          >
            <span
              className="grid size-7 place-items-center rounded-md text-white"
              style={{ background: i === 0 ? accent : `${accent}55` }}
            >
              <Package className="size-3.5" />
            </span>
            <span className="text-xs font-medium">{c}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockItem({ accent }: { accent: string }) {
  return (
    <div>
      <MockLabel>Wat wil je boeken?</MockLabel>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {["Kano", "Sloep"].map((it, i) => (
          <div
            key={it}
            className="overflow-hidden rounded-lg border border-border"
          >
            <div
              className="h-16 w-full"
              style={{ background: `${accent}${i === 0 ? "22" : "12"}` }}
            />
            <div className="p-2.5">
              <p className="text-xs font-semibold">{it}</p>
              <p
                className="mt-0.5 text-[11px] font-bold"
                style={{ color: accent }}
              >
                € {i === 0 ? "45" : "120"}/dag
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockDetails({ accent }: { accent: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <MockLabel>Wanneer</MockLabel>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-border px-3 py-2.5">
          <Calendar className="size-4" style={{ color: accent }} />
          <span className="text-xs text-muted-foreground">
            14 jun · 10:00 — 16 jun · 17:00
          </span>
        </div>
      </div>
      <div>
        <MockLabel>Jouw gegevens</MockLabel>
        <div className="mt-1.5 flex flex-col gap-2">
          <div className="h-9 rounded-lg border border-border bg-muted/30" />
          <div className="h-9 rounded-lg border border-border bg-muted/30" />
        </div>
      </div>
    </div>
  );
}

function MockPay({ accent }: { accent: string }) {
  return (
    <div>
      <MockLabel>Hoe wil je betalen?</MockLabel>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div
          className="flex flex-col gap-1.5 rounded-lg border p-3"
          style={{ borderColor: accent, background: `${accent}10` }}
        >
          <span
            className="grid size-7 place-items-center rounded-md text-white"
            style={{ background: accent }}
          >
            <MapPin className="size-3.5" />
          </span>
          <span className="text-xs font-semibold">Op locatie</span>
          <span className="text-[10px] text-muted-foreground">
            Betaal bij ophalen
          </span>
        </div>
        <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
          <span
            className="grid size-7 place-items-center rounded-md text-white"
            style={{ background: `${accent}66` }}
          >
            <CreditCard className="size-3.5" />
          </span>
          <span className="text-xs font-semibold">Online betalen</span>
          <span className="text-[10px] text-muted-foreground">
            iDEAL · creditcard
          </span>
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
