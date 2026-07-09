"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import type { Plan } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  cancelSubscriptionAction,
  changePlanAction,
  resumeSubscriptionAction,
  startCheckoutAction,
} from "@/lib/billing/actions";

/**
 * Eén client-component voor alle billing-knoppen op de page (start checkout,
 * plan-wissel, cancel, resume). Bevestigingen via de eigen Dialog i.p.v. de
 * kale browser-confirm().
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
 * Herbruikbare bevestigings-dialog voor billing-acties: nette titel,
 * uitleg, optioneel prijsregel, en een expliciete bevestig-knop met
 * pending-state. Fouten blijven ín de dialog staan zodat de gebruiker
 * kan lezen wat er mis ging.
 */
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  priceLine,
  confirmLabel,
  destructive = false,
  pending,
  err,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  body: string;
  priceLine?: string;
  confirmLabel: string;
  destructive?: boolean;
  pending: boolean;
  err: string | null;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        {priceLine && (
          <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
            <span className="text-xs font-medium text-muted-foreground">
              Nieuw maandbedrag
            </span>
            <span className="text-base font-semibold tabular-nums text-primary">
              {priceLine}
            </span>
          </div>
        )}
        {err && (
          <p className="flex items-start gap-1.5 text-xs text-destructive">
            <AlertCircle className="mt-0.5 size-3 shrink-0" />
            {err}
          </p>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Annuleren
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowRight className="size-4" />
            )}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  let body: string;
  if (isUpgrade && hasActiveSub) {
    body = `De nieuwe limieten en functies gelden direct. Het prijsverschil voor de rest van je huidige periode wordt automatisch via je betaalmethode verrekend; vanaf ${renewalLabel} betaal je het nieuwe maandbedrag.`;
  } else if (!isUpgrade && hasActiveSub) {
    body = `Je hebt al betaald voor je huidige periode, dus de wissel gaat in op ${renewalLabel}. Tot die tijd houd je je huidige plan, en je kunt de geplande wissel nog annuleren.`;
  } else if (isUpgrade) {
    body = "De nieuwe limieten en functies gelden direct.";
  } else {
    body = "Je houdt alles wat binnen dit plan past.";
  }

  function go() {
    setErr(null);
    startTransition(async () => {
      const res = await changePlanAction(plan);
      if (!res.ok) {
        setErr(res.error ?? "Wisselen mislukt");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErr(null);
          setOpen(true);
        }}
        className={
          isUpgrade
            ? "mt-4 inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
            : "mt-4 inline-flex h-9 w-full items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-accent"
        }
      >
        {isUpgrade ? `Upgrade naar ${planLabel}` : `Wissel naar ${planLabel}`}
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={
          isUpgrade
            ? `Upgraden naar ${planLabel}`
            : `Wisselen naar ${planLabel}`
        }
        body={body}
        priceLine={priceLabel}
        confirmLabel={isUpgrade ? "Upgrade bevestigen" : "Wissel bevestigen"}
        pending={pending}
        err={err}
        onConfirm={go}
      />
    </>
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
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function go() {
    setErr(null);
    startTransition(async () => {
      // Huidig plan "kiezen" = server-side de geplande downgrade annuleren.
      const res = await changePlanAction(currentPlan);
      if (!res.ok) {
        setErr(res.error ?? "Annuleren mislukt");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErr(null);
          setOpen(true);
        }}
        className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-accent"
      >
        Geplande wissel annuleren
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Geplande wissel annuleren"
        body={`De geplande wissel naar ${planLabel} wordt geannuleerd — je blijft gewoon op je huidige plan en het maandbedrag blijft ongewijzigd.`}
        confirmLabel="Ja, annuleer de wissel"
        pending={pending}
        err={err}
        onConfirm={go}
      />
    </>
  );
}

export function CancelSubscriptionButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function go() {
    setErr(null);
    startTransition(async () => {
      const res = await cancelSubscriptionAction();
      if (!res.ok) {
        setErr(res.error ?? "Opzeggen mislukt");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErr(null);
          setOpen(true);
        }}
        className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-xs font-medium text-muted-foreground hover:text-destructive"
      >
        Abonnement opzeggen
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Abonnement opzeggen"
        body="Je abonnement stopt aan het einde van de huidige betaalperiode. Tot die tijd blijft alles gewoon werken, en je kunt tot dat moment nog van gedachten veranderen."
        confirmLabel="Ja, zeg op"
        destructive
        pending={pending}
        err={err}
        onConfirm={go}
      />
    </>
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
