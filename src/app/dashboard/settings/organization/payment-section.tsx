"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, MapPin, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { savePaymentConfigAction } from "@/lib/payments/actions";

type Provider = "LOCATION" | "MOLLIE" | "STRIPE";

interface Initial {
  provider: Provider;
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
  const [provider, setProvider] = useState<Provider>(initial.provider);
  const [mollieKey, setMollieKey] = useState("");
  const [stripeKey, setStripeKey] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await savePaymentConfigAction({
        provider,
        mollieKey: mollieKey || undefined,
        stripeKey: stripeKey || undefined,
        stripeWebhookSecret: stripeWebhookSecret || undefined,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Betaalmethode opgeslagen");
      setMollieKey("");
      setStripeKey("");
      setStripeWebhookSecret("");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {/* Provider keuze */}
      <div className="grid gap-2 sm:grid-cols-3">
        <ProviderCard
          icon={MapPin}
          title="Op locatie"
          description="Klant betaalt bij ophalen — geen online checkout."
          active={provider === "LOCATION"}
          onClick={() => setProvider("LOCATION")}
          disabled={disabled}
        />
        <ProviderCard
          icon={CreditCard}
          title="Mollie"
          description="iDEAL, creditcard, Bancontact via je eigen Mollie-account."
          active={provider === "MOLLIE"}
          onClick={() => setProvider("MOLLIE")}
          disabled={disabled}
          accent="oklch(0.62 0.20 340)"
        />
        <ProviderCard
          icon={CreditCard}
          title="Stripe"
          description="Wereldwijde kaarten via je eigen Stripe-account."
          active={provider === "STRIPE"}
          onClick={() => setProvider("STRIPE")}
          disabled={disabled}
          accent="oklch(0.55 0.18 270)"
        />
      </div>

      {provider === "LOCATION" && (
        <div className="rounded-lg border border-dashed border-border bg-card/40 px-4 py-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Op locatie geactiveerd.</span>{" "}
          Boekingen komen binnen als &quot;In afwachting&quot; — bevestig en factureer
          handmatig vanuit je dashboard.
        </div>
      )}

      {provider === "MOLLIE" && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <span className="text-sm font-semibold">Mollie API-key</span>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Vind je key op{" "}
            <a
              href="https://my.mollie.com/dashboard/developers/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:underline"
            >
              my.mollie.com → Developers → API-keys
            </a>
            . Begint met <code className="rounded bg-muted px-1">test_</code> of{" "}
            <code className="rounded bg-muted px-1">live_</code>. Wij versleutelen 'm
            voor we hem opslaan.
          </p>
          {initial.mollieKeyMasked && (
            <p className="text-[11px] text-muted-foreground">
              Huidige key: <code className="rounded bg-muted px-1.5">{initial.mollieKeyMasked}</code>{" "}
              — laat leeg om te behouden.
            </p>
          )}
          <Input
            type="password"
            placeholder={initial.mollieKeyMasked ? "Nieuwe key — laat leeg om te behouden" : "test_xxx of live_xxx"}
            autoComplete="off"
            value={mollieKey}
            onChange={(e) => setMollieKey(e.target.value)}
            disabled={disabled}
          />
        </div>
      )}

      {provider === "STRIPE" && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <span className="text-sm font-semibold">Stripe secret key</span>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Vind je key op{" "}
            <a
              href="https://dashboard.stripe.com/apikeys"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:underline"
            >
              dashboard.stripe.com → API keys
            </a>
            . Begint met <code className="rounded bg-muted px-1">sk_test_</code> of{" "}
            <code className="rounded bg-muted px-1">sk_live_</code>.
          </p>
          {initial.stripeKeyMasked && (
            <p className="text-[11px] text-muted-foreground">
              Huidige key: <code className="rounded bg-muted px-1.5">{initial.stripeKeyMasked}</code>{" "}
              — laat leeg om te behouden.
            </p>
          )}
          <Input
            type="password"
            placeholder={initial.stripeKeyMasked ? "Nieuwe key — laat leeg om te behouden" : "sk_test_xxx of sk_live_xxx"}
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
              Voeg een endpoint toe in Stripe → Developers → Webhooks naar{" "}
              <code className="rounded bg-muted px-1">/api/payments/stripe/webhook</code>{" "}
              en plak het signing secret hier. Zonder secret accepteren we
              webhooks ongeauthenticeerd (alleen aanrader voor test_).
            </p>
            {initial.hasStripeWebhookSecret && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Webhook-secret is ingesteld — laat leeg om te behouden.
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

      <div>
        <Button type="submit" disabled={disabled || pending}>
          {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Betaalmethode opslaan
        </Button>
      </div>
    </form>
  );
}

function ProviderCard({
  icon: Icon,
  title,
  description,
  active,
  onClick,
  disabled,
  accent,
}: {
  icon: typeof MapPin;
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  accent?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group flex flex-col gap-2 rounded-xl border p-4 text-left transition-all ${
        active
          ? "border-primary/50 bg-primary/5 shadow-sm"
          : "border-border bg-card hover:border-border/80 hover:bg-accent/30"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <div className="flex items-center justify-between">
        <span
          className="grid size-8 place-items-center rounded-md text-white"
          style={{ background: active ? "var(--primary)" : accent ?? "oklch(0.55 0 0)" }}
        >
          <Icon className="size-4" />
        </span>
        {active && (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-semibold tracking-wider uppercase text-primary">
            Actief
          </span>
        )}
      </div>
      <p className="text-sm font-semibold tracking-tight">{title}</p>
      <p className="text-[11px] leading-relaxed text-muted-foreground">{description}</p>
    </button>
  );
}
