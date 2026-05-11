"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  KeyRound,
  Loader2,
  ShieldCheck,
  ShieldOff,
  ShieldQuestion,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TwoFactorSetupForm } from "@/components/auth/TwoFactorSetupForm";
import {
  disableTwoFactorAction,
  regenerateBackupCodesAction,
} from "@/lib/twofa/actions";

export function TwoFactorSection({
  enabled,
  enabledAt,
  isAdmin,
}: {
  enabled: boolean;
  enabledAt: string | null;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [regenCodes, setRegenCodes] = useState<string[] | null>(null);
  const [pending, startTransition] = useTransition();

  const handleDisable = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await disableTwoFactorAction(password);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("2FA uitgezet");
      setDisableOpen(false);
      setPassword("");
      router.refresh();
    });
  };

  const handleRegen = () => {
    startTransition(async () => {
      const res = await regenerateBackupCodesAction();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setRegenCodes(res.data?.backupCodes ?? null);
    });
  };

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Twee-staps verificatie</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {isAdmin
              ? "Verplicht voor platform-admins. Je kan 'm niet uitschakelen."
              : "Optioneel — extra beveiligingslaag bovenop je wachtwoord."}
          </p>
        </div>
        {enabled ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[oklch(0.7_0.13_150)]/15 px-2.5 py-1 text-xs font-medium text-[oklch(0.5_0.14_150)]">
            <ShieldCheck className="size-3.5" /> Aan
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <ShieldOff className="size-3.5" /> Uit
          </span>
        )}
      </div>

      {enabled ? (
        <div className="mt-5 flex flex-col gap-3">
          {enabledAt && (
            <p className="text-xs text-muted-foreground">
              Actief sinds {format(parseISO(enabledAt), "d MMMM yyyy", { locale: nl })}.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRegenOpen(true)}
              disabled={pending}
            >
              <KeyRound className="size-4" />
              Nieuwe backup-codes
            </Button>
            {!isAdmin && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setDisableOpen(true)}
              >
                <ShieldOff className="size-4" />
                Uitschakelen
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <Button onClick={() => setSetupOpen(true)}>
            <ShieldQuestion className="size-4" />
            2FA instellen
          </Button>
        </div>
      )}

      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>2FA instellen</DialogTitle>
            <DialogDescription>
              Scan de QR met je authenticator-app en bevestig met de eerste
              code.
            </DialogDescription>
          </DialogHeader>
          {setupOpen && (
            <TwoFactorSetupForm
              mode="opt-in"
              onDone={() => {
                setSetupOpen(false);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={regenOpen} onOpenChange={setRegenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe backup-codes</DialogTitle>
            <DialogDescription>
              Oude codes worden ongeldig. Bewaar de nieuwe codes goed.
            </DialogDescription>
          </DialogHeader>
          {regenCodes ? (
            <>
              <ul className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-4 font-mono text-sm tabular-nums">
                {regenCodes.map((c) => (
                  <li key={c} className="text-center">{c}</li>
                ))}
              </ul>
              <DialogFooter>
                <Button
                  type="button"
                  onClick={() => {
                    navigator.clipboard
                      .writeText(regenCodes.join("\n"))
                      .catch(() => {});
                    toast.success("Codes gekopieerd");
                  }}
                >
                  Kopieer alle
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRegenOpen(false);
                    setRegenCodes(null);
                    router.refresh();
                  }}
                >
                  Klaar
                </Button>
              </DialogFooter>
            </>
          ) : (
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRegenOpen(false)}
              >
                Annuleren
              </Button>
              <Button type="button" onClick={handleRegen} disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin" />}
                Genereer
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>2FA uitschakelen</DialogTitle>
            <DialogDescription>
              Bevestig je wachtwoord om 2FA uit te schakelen.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDisable} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pw-disable">Wachtwoord</Label>
              <Input
                id="pw-disable"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDisableOpen(false)}
              >
                Annuleren
              </Button>
              <Button type="submit" variant="destructive" disabled={pending || !password}>
                {pending && <Loader2 className="size-4 animate-spin" />}
                Uitschakelen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
