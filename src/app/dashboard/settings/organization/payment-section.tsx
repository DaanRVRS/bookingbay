"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Loader2,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OnlineProvider = "MOLLIE" | "STRIPE";

interface Initial {
  acceptLocation: boolean;
  onlineProvider: OnlineProvider | null;
  mollieKeyMasked: string | null;
  stripeKeyMasked: string | null;
  hasStripeWebhookSecret: boolean;
}

interface Props {
  initial: Initial;
  disabled?: boolean;
}

export function PaymentSection({ initial, disabled }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [acceptLocation, setAcceptLocation] = useState(initial.acceptLocation);
  const [onlineOn, setOnlineOn] = useState(initial.onlineProvider !== null);
  const [onlineProvider, setOnlineProvider] = useState<OnlineProvider>(
    initial.onlineProvider ?? "MOLLIE",
  );
  const [mollieKey, setMollieKey] = useState("");
  const [stripeKey, setStripeKey] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      // Plain API-route i.p.v. Server Action — deploy-stabiel (geen
      // action-ID-skew die anders een "page couldn't load" geeft).
      let res: { ok: boolean; error?: string };
      try {
        const r = await fetch("/api/dashboard/payment-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            acceptLocation,
            onlineProvider: onlineOn ? onlineProvider : null,
            mollieKey: mollieKey || undefined,
            stripeKey: stripeKey || undefined,
            stripeWebhookSecret: stripeWebhookSecret || undefined,
          }),
        });
        res = await r.json();
      } catch {
        toast.error("Verbinding mislukt. Probeer het opnieuw.");
        return;
      }
      if (!res.ok) {
        toast.error(res.error ?? "Opslaan mislukt");
        return;
      }
      toast.success("Betaalmethodes opgeslagen");
      setMollieKey("");
      setStripeKey("");
      setStripeWebhookSecret("");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {/* Op locatie + Online — twee losse schakelaars, mogen beide aan */}
      <div className="grid gap-3 sm:grid-cols-2">
        <ToggleCard
          icon={MapPin}
          title="Op locatie"
          description="Klant betaalt bij ophalen. Boeking komt binnen als 'In afwachting'."
          on={acceptLocation}
          onToggle={() => setAcceptLocation((v) => !v)}
          disabled={disabled}
          accent="oklch(0.62 0.19 30)"
        />
        <ToggleCard
          icon={CreditCard}
          title="Online betalen"
          description="Klant rekent direct af via je eigen account."
          on={onlineOn}
          onToggle={() => setOnlineOn((v) => !v)}
          disabled={disabled}
          accent="oklch(0.55 0.18 270)"
          logos={
            <span className="flex items-center gap-1.5">
              <MollieMark className="text-sm" />
              <span className="text-muted-foreground/40">·</span>
              <Icon icon="logos:stripe" className="h-3.5 w-auto" />
            </span>
          }
        />
      </div>

      {/* Online-detail: alleen zichtbaar als online aan staat */}
      {onlineOn && (
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <p className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
            Welke provider?
          </p>
          <div className="mt-2 inline-flex rounded-lg border border-border bg-background p-0.5">
            <ProviderTab
              label="Mollie"
              icon="mollie"
              active={onlineProvider === "MOLLIE"}
              onClick={() => setOnlineProvider("MOLLIE")}
              disabled={disabled}
            />
            <ProviderTab
              label="Stripe"
              icon="logos:stripe"
              active={onlineProvider === "STRIPE"}
              onClick={() => setOnlineProvider("STRIPE")}
              disabled={disabled}
            />
          </div>

          {onlineProvider === "MOLLIE" ? (
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                <span className="text-sm font-semibold">Mollie API-key</span>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Op{" "}
                <a
                  href="https://my.mollie.com/dashboard/developers/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground hover:underline"
                >
                  my.mollie.com → Developers → API-keys
                </a>
                . Begint met <code className="rounded bg-muted px-1">test_</code>{" "}
                of <code className="rounded bg-muted px-1">live_</code>. Wordt
                versleuteld opgeslagen.
              </p>
              {initial.mollieKeyMasked && (
                <p className="text-[11px] text-muted-foreground">
                  Huidig:{" "}
                  <code className="rounded bg-muted px-1.5">
                    {initial.mollieKeyMasked}
                  </code>{" "}
                  — laat leeg om te behouden.
                </p>
              )}
              <Input
                type="password"
                placeholder={
                  initial.mollieKeyMasked
                    ? "Nieuwe key — leeg = behouden"
                    : "test_xxx of live_xxx"
                }
                autoComplete="off"
                value={mollieKey}
                onChange={(e) => setMollieKey(e.target.value)}
                disabled={disabled}
              />
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                <span className="text-sm font-semibold">Stripe secret key</span>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Op{" "}
                <a
                  href="https://dashboard.stripe.com/apikeys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground hover:underline"
                >
                  dashboard.stripe.com → API keys
                </a>
                . Begint met{" "}
                <code className="rounded bg-muted px-1">sk_test_</code> of{" "}
                <code className="rounded bg-muted px-1">sk_live_</code>.
              </p>
              {initial.stripeKeyMasked && (
                <p className="text-[11px] text-muted-foreground">
                  Huidig:{" "}
                  <code className="rounded bg-muted px-1.5">
                    {initial.stripeKeyMasked}
                  </code>{" "}
                  — laat leeg om te behouden.
                </p>
              )}
              <Input
                type="password"
                placeholder={
                  initial.stripeKeyMasked
                    ? "Nieuwe key — leeg = behouden"
                    : "sk_test_xxx of sk_live_xxx"
                }
                autoComplete="off"
                value={stripeKey}
                onChange={(e) => setStripeKey(e.target.value)}
                disabled={disabled}
              />
              <div className="mt-1 border-t border-border pt-3">
                <Label htmlFor="stripeWebhookSecret" className="text-xs">
                  Stripe webhook signing secret (optioneel)
                </Label>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Endpoint in Stripe → Developers → Webhooks naar{" "}
                  <code className="rounded bg-muted px-1">
                    /api/payments/stripe/webhook
                  </code>{" "}
                  — plak het signing secret hier.
                </p>
                {initial.hasStripeWebhookSecret && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Secret is ingesteld — laat leeg om te behouden.
                  </p>
                )}
                <Input
                  id="stripeWebhookSecret"
                  type="password"
                  placeholder="whsec_..."
                  autoComplete="off"
                  value={stripeWebhookSecret}
                  onChange={(e) => setStripeWebhookSecret(e.target.value)}
                  disabled={disabled}
                  className="mt-2"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {!acceptLocation && !onlineOn && (
        <p className="text-xs font-medium text-destructive">
          Zet minimaal één betaalmethode aan.
        </p>
      )}

      <div>
        <Button type="submit" disabled={disabled || pending}>
          {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Betaalmethodes opslaan
        </Button>
      </div>
    </form>
  );
}

function ToggleCard({
  icon: Icon,
  title,
  description,
  on,
  onToggle,
  disabled,
  accent,
  logos,
}: {
  icon: typeof MapPin;
  title: string;
  description: string;
  on: boolean;
  onToggle: () => void;
  disabled?: boolean;
  accent: string;
  logos?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`group flex flex-col gap-2 rounded-xl border p-4 text-left transition-all ${
        on
          ? "border-primary/50 bg-primary/5 shadow-sm"
          : "border-border bg-card hover:bg-accent/30"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <div className="flex items-center justify-between">
        <span
          className="grid size-8 place-items-center rounded-md text-white"
          style={{ background: on ? "var(--primary)" : accent }}
        >
          <Icon className="size-4" />
        </span>
        {/* Switch */}
        <span
          className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            on ? "bg-primary" : "bg-muted"
          }`}
          aria-hidden
        >
          <span
            className={`inline-block size-4 transform rounded-full bg-background shadow transition-transform ${
              on ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </span>
      </div>
      <p className="text-sm font-semibold tracking-tight">{title}</p>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {description}
      </p>
      {logos && <div className="mt-1">{logos}</div>}
    </button>
  );
}

/**
 * Wordmark voor Mollie. iconify's "logos:" collectie heeft géén Mollie-
 * icoon (alleen Stripe e.d.) — vandaar dat alleen Stripe rendeerde. We
 * tekenen 'm zelf: lowercase wordmark in Mollie's donkerblauwe huiskleur,
 * dezelfde stijl als de iconify-Stripe-wordmark.
 */
function MollieMark({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-baseline font-bold leading-none tracking-tight ${className ?? ""}`}
      style={{ color: "#000957", letterSpacing: "-0.02em" }}
      aria-label="Mollie"
    >
      mollie
    </span>
  );
}

function ProviderTab({
  label,
  icon,
  active,
  onClick,
  disabled,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      {icon === "mollie" ? (
        <MollieMark className="text-sm" />
      ) : (
        <Icon icon={icon} className="h-4 w-auto" />
      )}
      {label}
    </button>
  );
}
