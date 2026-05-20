"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Play,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  cancelBookingAction,
  completeBookingAction,
  setBookingStatusAction,
} from "@/lib/bookings/actions";
import type { DerivedKey } from "@/lib/bookings/status";

/**
 * Rij-acties op /bookings — per status andere knoppen:
 *  - Gereserveerd: "Op bezig" + "Annuleren" (met inline confirm)
 *  - Bezig:        "Op voltooid" (opent dialog met schade + opmerkingen)
 *  - Voltooid / Geannuleerd: geen acties
 *
 * Bewust kleine inline knoppen i.p.v. een 3-puntjes-menu — sneller te
 * scannen wat er met een rij kan.
 */
export function BookingRowActions({
  bookingId,
  derivedKey,
}: {
  bookingId: string;
  derivedKey: DerivedKey;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);

  const onStart = () => {
    startTransition(async () => {
      const res = await setBookingStatusAction(bookingId, "IN_PROGRESS");
      if (res.ok) {
        toast.success("Boeking op 'Bezig' gezet");
        router.refresh();
      } else {
        toast.error(res.error ?? "Status wijzigen mislukt");
      }
    });
  };

  const onCancel = () => {
    startTransition(async () => {
      const res = await cancelBookingAction(bookingId);
      if (res.ok) {
        toast.success("Boeking geannuleerd");
        setConfirmingCancel(false);
        router.refresh();
      } else {
        toast.error(res.error ?? "Annuleren mislukt");
      }
    });
  };

  // Vaste actie-kolom-breedte zodat alle rijen rechts uitlijnen, óók
  // als er geen knoppen zijn (Voltooid/Geannuleerd).
  const wrap = (content: React.ReactNode) => (
    <div className="flex w-[200px] shrink-0 items-center justify-end gap-1.5">
      {content}
    </div>
  );

  if (derivedKey === "RESERVED") {
    return wrap(
      !confirmingCancel ? (
        <>
          <button
            type="button"
            onClick={onStart}
            disabled={pending}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-[11px] font-medium transition-colors hover:bg-accent disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Play className="size-3" />
            )}
            Op bezig
          </button>
          <button
            type="button"
            onClick={() => setConfirmingCancel(true)}
            disabled={pending}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive disabled:opacity-60"
          >
            <X className="size-3" />
            Annuleren
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="inline-flex h-8 items-center gap-1 rounded-md bg-destructive px-2.5 text-[11px] font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending && <Loader2 className="size-3 animate-spin" />}
            Bevestig annuleren
          </button>
          <button
            type="button"
            onClick={() => setConfirmingCancel(false)}
            disabled={pending}
            className="inline-flex h-8 items-center rounded-md border border-border bg-background px-2.5 text-[11px] font-medium transition-colors hover:bg-accent disabled:opacity-60"
          >
            Terug
          </button>
        </>
      ),
    );
  }

  if (derivedKey === "ACTIVE") {
    return (
      <>
        {wrap(
          <button
            type="button"
            onClick={() => setCompleteOpen(true)}
            disabled={pending}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-[11px] font-medium transition-colors hover:bg-accent disabled:opacity-60"
          >
            <CheckCircle2 className="size-3 text-[oklch(0.5_0.14_150)]" />
            Op voltooid
          </button>,
        )}
        <CompleteDialog
          open={completeOpen}
          onOpenChange={setCompleteOpen}
          bookingId={bookingId}
          onDone={() => {
            router.refresh();
          }}
        />
      </>
    );
  }

  // Voltooid / Geannuleerd: geen acties, maar wel ruimte reserveren zodat
  // de rest van de rij op één lijn blijft met de andere rijen.
  return wrap(null);
}

function CompleteDialog({
  open,
  onOpenChange,
  bookingId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bookingId: string;
  onDone: () => void;
}) {
  const [damage, setDamage] = useState(false);
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await completeBookingAction({
        id: bookingId,
        damage,
        notes: notes.trim() || undefined,
      });
      if (res.ok) {
        toast.success("Boeking afgerond");
        onOpenChange(false);
        setDamage(false);
        setNotes("");
        onDone();
      } else {
        toast.error(res.error ?? "Voltooien mislukt");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Boeking voltooien</DialogTitle>
          <DialogDescription>
            Leg vast of er bij oplevering iets bijzonders was. Optioneel —
            laat leeg als alles in orde was.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="mt-2 flex flex-col gap-4">
          {/* Schade-toggle (bolletje-slider) */}
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-3">
            <ToggleSwitch checked={damage} onChange={setDamage} />
            <span className="flex-1 text-sm">
              <span className="block font-medium">Schade gemeld</span>
              <span className="block text-xs text-muted-foreground">
                Vink aan als er iets stuk, ontbrekend of beschadigd is.
              </span>
            </span>
            {damage && (
              <AlertTriangle className="size-4 shrink-0 text-[oklch(0.7_0.16_60)]" />
            )}
          </label>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="completion-notes" className="text-xs">
              Opmerkingen
            </Label>
            <Textarea
              id="completion-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                damage
                  ? "Bv. klein krasje op het bakboord, peddel ontbreekt."
                  : "Optioneel — opvallendheden of opmerkingen."
              }
              maxLength={500}
            />
            <p className="text-[11px] text-muted-foreground">
              Zichtbaar op de boekingsdetails. Max 500 tekens.
            </p>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={pending}
              className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Voltooien
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${
        checked ? "bg-[oklch(0.7_0.16_60)]" : "bg-muted"
      }`}
    >
      <span
        className={`absolute top-0.5 size-4 rounded-full bg-background shadow-sm transition-transform ${
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
