"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/auth/FormField";
import { deleteAccountAction } from "@/lib/settings/actions";

export function DeleteAccountSection({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onConfirm = () => {
    setError(null);
    startTransition(async () => {
      const res = await deleteAccountAction({ password });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success("Je account is verwijderd");
      // Sessiecookies wissen via de route handler (JWT-sessie) en terug
      // naar de homepage.
      window.location.href = "/api/sign-out?next=/";
    });
  };

  return (
    <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
      <h2 className="text-base font-semibold text-destructive">Account verwijderen</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Verwijdert je gebruikersaccount definitief: naam, e-mailadres,
        wachtwoord, tweestapsverificatie, notificaties en je lidmaatschappen.
        Boekingen, klanten en organisaties blijven bij de organisatie; ben je
        de enige eigenaar of loopt er nog een abonnement, dan moet je dat
        eerst regelen.
      </p>
      <div className="mt-4">
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          disabled={isAdmin}
          className="border-destructive/40 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="size-4" />
          Account verwijderen
        </Button>
        {isAdmin && (
          <p className="mt-2 text-xs text-muted-foreground">
            Beheerdersaccounts kunnen niet zelf worden verwijderd.
          </p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Account definitief verwijderen?</DialogTitle>
            <DialogDescription>
              Dit kan niet ongedaan worden gemaakt. Bevestig met je wachtwoord.
            </DialogDescription>
          </DialogHeader>
          <FormField
            label="Wachtwoord"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error ?? undefined}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Annuleren
            </Button>
            <Button
              variant="destructive"
              disabled={pending || password.length === 0}
              onClick={onConfirm}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Definitief verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
