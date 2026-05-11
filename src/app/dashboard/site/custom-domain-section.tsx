"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  Copy,
  Globe,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
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
import {
  removeCustomDomainAction,
  setCustomDomainAction,
  verifyCustomDomainAction,
} from "@/lib/custom-domain/actions";

export function CustomDomainSection({
  initialDomain,
  initialVerifiedAt,
  cnameTarget,
  planAllows,
}: {
  initialDomain: string | null;
  initialVerifiedAt: string | null;
  cnameTarget: string;
  planAllows: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [domain, setDomain] = useState(initialDomain ?? "");
  const [removeOpen, setRemoveOpen] = useState(false);
  const [lastVerify, setLastVerify] = useState<{
    observed?: string[];
    expected: string;
    verified: boolean;
  } | null>(null);

  const isSet = !!initialDomain;
  const isVerified = !!initialVerifiedAt;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) {
      toast.error("Vul een domein in");
      return;
    }
    startTransition(async () => {
      const res = await setCustomDomainAction({ domain });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Domein opgeslagen — verifieer nu de CNAME");
      router.refresh();
    });
  };

  const verify = () => {
    startTransition(async () => {
      const res = await verifyCustomDomainAction();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setLastVerify(res.data ?? null);
      if (res.data?.verified) {
        toast.success("Domein geverifieerd — SSL wordt automatisch geregeld");
      } else {
        toast.error(
          "CNAME nog niet correct — DNS-wijzigingen kunnen tot 24u duren",
        );
      }
      router.refresh();
    });
  };

  const remove = () => {
    startTransition(async () => {
      const res = await removeCustomDomainAction();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setDomain("");
      setRemoveOpen(false);
      toast.success("Domein losgekoppeld");
      router.refresh();
    });
  };

  const copyTarget = async () => {
    try {
      await navigator.clipboard.writeText(cnameTarget);
      toast.success("Gekopieerd");
    } catch {
      toast.error("Kopiëren mislukt");
    }
  };

  if (!planAllows) {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Globe className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">Eigen domein + SSL</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Beschikbaar vanaf <strong>Professional</strong>. Op hogere plannen
              kun je je site op je eigen domein hosten (b.v.{" "}
              <code className="rounded bg-muted px-1">boekingen.jouwsite.nl</code>
              ) met automatische HTTPS.
            </p>
            <a
              href="/dashboard/settings/billing"
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium hover:bg-accent"
            >
              Upgrade plan
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Globe className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold">Eigen domein + SSL</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Host je klantsite op je eigen domein. HTTPS wordt automatisch
              geregeld via Let&apos;s Encrypt zodra de CNAME klopt.
            </p>
          </div>
        </div>
        {isSet ? (
          isVerified ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[oklch(0.7_0.13_150)]/15 px-2.5 py-1 text-xs font-medium text-[oklch(0.5_0.14_150)]">
              <ShieldCheck className="size-3.5" /> Actief
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[oklch(0.95_0.06_70)] px-2.5 py-1 text-xs font-medium text-[oklch(0.45_0.13_70)]">
              <ShieldAlert className="size-3.5" /> Wacht op DNS
            </span>
          )
        ) : null}
      </div>

      {!isSet ? (
        <form onSubmit={save} className="mt-5 flex flex-col gap-3">
          <Label htmlFor="domain">Jouw domein</Label>
          <div className="flex gap-2">
            <Input
              id="domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="boekingen.jouwsite.nl"
              required
            />
            <Button type="submit" disabled={pending || !domain.trim()}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Opslaan
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Zonder <code className="rounded bg-muted px-1">https://</code>{" "}
            of trailing slash. Apex (jouwsite.nl) kan ook — gebruik dan ALIAS
            of CNAME-flattening bij je DNS-provider.
          </p>
        </form>
      ) : (
        <div className="mt-5 flex flex-col gap-4">
          <div className="rounded-md border border-border bg-background p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Domein
            </p>
            <p className="mt-1 font-mono text-sm">{initialDomain}</p>
          </div>

          <div className="rounded-md border border-border bg-background p-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Stap 1 — DNS instellen
            </p>
            <p className="mt-2 text-sm">
              Zet bij je DNS-provider een{" "}
              <strong>CNAME-record</strong> voor{" "}
              <code className="rounded bg-muted px-1">{initialDomain}</code>{" "}
              naar:
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 truncate rounded-md border border-border bg-card px-3 py-2 font-mono text-sm">
                {cnameTarget}
              </code>
              <button
                type="button"
                onClick={copyTarget}
                className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-card hover:bg-accent"
                aria-label="Kopieer CNAME-target"
              >
                <Copy className="size-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              DNS-wijzigingen zijn binnen enkele minuten zichtbaar bij de meeste
              providers; soms duurt het tot 24 uur.
            </p>
          </div>

          <div className="rounded-md border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Stap 2 — Verifieer
                </p>
                <p className="mt-1 text-sm">
                  {isVerified
                    ? "Domein gekoppeld + SSL actief."
                    : "Klik om te checken of de CNAME klopt."}
                </p>
              </div>
              <Button onClick={verify} disabled={pending} variant="outline">
                {pending && <Loader2 className="size-4 animate-spin" />}
                <CheckCircle2 className="size-4" />
                {isVerified ? "Opnieuw controleren" : "Verifiëren"}
              </Button>
            </div>
            {lastVerify && !lastVerify.verified && (
              <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs">
                <p className="font-medium text-destructive">
                  CNAME wijst nog niet naar het juiste adres.
                </p>
                <p className="mt-1 text-muted-foreground">
                  Verwacht:{" "}
                  <code className="font-mono">{lastVerify.expected}</code>
                  {lastVerify.observed && lastVerify.observed.length > 0 && (
                    <>
                      <br />
                      Gevonden:{" "}
                      <code className="font-mono">
                        {lastVerify.observed.join(", ")}
                      </code>
                    </>
                  )}
                </p>
              </div>
            )}
          </div>

          {isVerified && (
            <p className="rounded-md border border-[oklch(0.7_0.13_150)]/30 bg-[oklch(0.7_0.13_150)]/5 px-3 py-2 text-xs text-[oklch(0.45_0.14_150)]">
              <strong>Klaar.</strong> Je site is bereikbaar op{" "}
              <a
                href={`https://${initialDomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                https://{initialDomain}
              </a>
              . Het Let&apos;s Encrypt-certificaat wordt automatisch verlengd.
            </p>
          )}

          <div>
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => setRemoveOpen(true)}
            >
              <Trash2 className="size-4" />
              Domein loskoppelen
            </Button>
          </div>
        </div>
      )}

      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Domein loskoppelen?</DialogTitle>
            <DialogDescription>
              Je site is daarna alleen nog bereikbaar op je standaard
              BookingBay-URL. Het SSL-certificaat wordt automatisch
              opgeschoond.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRemoveOpen(false)}
            >
              Annuleren
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={remove}
              disabled={pending}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Loskoppelen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
