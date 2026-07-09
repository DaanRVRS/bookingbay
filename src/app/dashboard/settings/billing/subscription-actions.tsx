"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import type { Plan } from "@prisma/client";
import {
  cancelSubscriptionAction,
  changePlanAction,
  resumeSubscriptionAction,
  startCheckoutAction,
} from "@/lib/billing/actions";

/**
 * Eén client-component voor alle billing-knoppen op de page (start checkout,
 * cancel, resume). Houdt UI-state lokaal en triggert server-actions met
 * useTransition zodat we 'n pending-spinner kunnen tonen.
 */
export function StartCheckoutButton({
  label = "Start abonnement",
}: {
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function go() {
    setErr(null);
    startTransition(async () => {
      const res = await startCheckoutAction();
      if (!res.ok) {
        setErr(res.error ?? "Checkout mislukt");
        return;
      }
      window.location.href = res.data!.checkoutUrl;
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={go}
        disabled={pending}
        className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--primary)_55%,transparent)] disabled:opacity-50"
      >
        {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
        {label}
      </button>
      {err && (
        <p className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertCircle className="mt-0.5 size-3 shrink-0" />
          {err}
        </p>
      )}
    </div>
  );
}

/**
 * Zelf wisselen van plan op de plan-kaarten. Upgrade werkt direct (bij een
 * actief abonnement met pro-rata verrekening van het verschil); downgrade
 * gaat in bij de volgende verlenging. Server-side geweigerd met uitleg als
 * het huidige gebruik niet in het doelplan past.
 */
export function ChangePlanButton({
  plan,
  planLabel,
  priceLabel,
  isUpgrade,
  hasActiveSub,
  renewalLabel,
}: {
  plan: Plan;
  planLabel: string;
  priceLabel: string;
  isUpgrade: boolean;
  hasActiveSub: boolean;
  renewalLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function go() {
    let msg: string;
    if (isUpgrade && hasActiveSub) {
      msg = `Upgraden naar ${planLabel} (${priceLabel})?\n\nDe nieuwe limieten en functies gelden direct. Het prijsverschil voor de rest van je huidige periode wordt automatisch via je betaalmethode verrekend; vanaf ${renewalLabel} betaal je het nieuwe maandbedrag.`;
    } else if (!isUpgrade && hasActiveSub) {
      msg = `Wisselen naar ${planLabel} (${priceLabel})?\n\nJe hebt al betaald voor je huidige periode, dus de wissel gaat in op ${renewalLabel}. Tot die tijd houd je je huidige plan. Je kunt de geplande wissel tot dat moment annuleren.`;
    } else if (isUpgrade) {
      msg = `Upgraden naar ${planLabel} (${priceLabel})?\n\nDe nieuwe limieten en functies gelden direct.`;
    } else {
      msg = `Wisselen naar ${planLabel} (${priceLabel})?\n\nJe houdt alles wat binnen dit plan past.`;
    }
    if (!confirm(msg)) return;
    setErr(null);
    startTransition(async () => {
      const res = await changePlanAction(plan);
      if (!res.ok) {
        setErr(res.error ?? "Wisselen mislukt");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      <button
        type="button"
        onClick={go}
        disabled={pending}
        className={
          isUpgrade
            ? "inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            : "inline-flex h-9 w-full items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-accent disabled:opacity-50"
        }
      >
        {pending && <Loader2 className="mr-2 size-3.5 animate-spin" />}
        {isUpgrade ? `Upgrade naar ${planLabel}` : `Wissel naar ${planLabel}`}
      </button>
      {err && (
        <p className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertCircle className="mt-0.5 size-3 shrink-0" />
          {err}
        </p>
      )}
    </div>
  );
}

/**
 * Op de kaart van een geplande downgrade: annuleer de wissel — je blijft
 * dan gewoon op je huidige plan en het Mollie-bedrag gaat terug omhoog.
 */
export function CancelScheduledPlanButton({
  currentPlan,
  planLabel,
}: {
  currentPlan: Plan;
  planLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function go() {
    if (!confirm(`Geplande wissel naar ${planLabel} annuleren? Je blijft dan op je huidige plan.`)) return;
    setErr(null);
    startTransition(async () => {
      // Huidig plan "kiezen" = server-side de geplande downgrade annuleren.
      const res = await changePlanAction(currentPlan);
      if (!res.ok) {
        setErr(res.error ?? "Annuleren mislukt");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      <button
        type="button"
        onClick={go}
        disabled={pending}
        className="inline-flex h-9 w-full items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-accent disabled:opacity-50"
      >
        {pending && <Loader2 className="mr-2 size-3.5 animate-spin" />}
        Geplande wissel annuleren
      </button>
      {err && (
        <p className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertCircle className="mt-0.5 size-3 shrink-0" />
          {err}
        </p>
      )}
    </div>
  );
}

export function CancelSubscriptionButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function confirmAndCancel() {
    if (!confirm("Weet je zeker dat je je abonnement wil opzeggen? Service loopt door tot de huidige periode afloopt.")) return;
    setErr(null);
    startTransition(async () => {
      const res = await cancelSubscriptionAction();
      if (!res.ok) {
        setErr(res.error ?? "Opzeggen mislukt");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={confirmAndCancel}
        disabled={pending}
        className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-xs font-medium text-muted-foreground hover:text-destructive disabled:opacity-50"
      >
        {pending && <Loader2 className="mr-2 size-3 animate-spin" />}
        Abonnement opzeggen
      </button>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}

export function ResumeSubscriptionButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function go() {
    setErr(null);
    startTransition(async () => {
      const res = await resumeSubscriptionAction();
      if (!res.ok) {
        setErr(res.error ?? "Hervatten mislukt");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={go}
        disabled={pending}
        className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
        Toch doorgaan — abonnement hervatten
      </button>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}
