"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  beginSetupAction,
  confirmSetupAction,
} from "@/lib/twofa/actions";

interface SetupPayload {
  secret: string;
  otpauthUrl: string;
  qrDataUrl: string;
}

function safeNext(next: string | null | undefined): string {
  if (!next) return "/dashboard";
  if (!next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}

/**
 * Shared setup UI used by both the forced-setup flow (during login) and
 * the opt-in flow from /dashboard/settings/profile. `mode="forced"` is
 * triggered from the login pending-handoff and signs the user in after
 * confirmation. `mode="opt-in"` is called by an already-logged-in user.
 */
export function TwoFactorSetupForm({
  mode,
  next,
  onDone,
}: {
  mode: "forced" | "opt-in";
  next?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [payload, setPayload] = useState<SetupPayload | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const [initLoading, setInitLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await beginSetupAction();
      if (!res.ok) {
        toast.error(res.error);
        setInitLoading(false);
        return;
      }
      setPayload(res.data ?? null);
      setInitLoading(false);
    })();
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[0-9]{6}$/.test(code.trim())) {
      toast.error("Voer een 6-cijferige code in");
      return;
    }
    startTransition(async () => {
      const res = await confirmSetupAction(code.trim());
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setBackupCodes(res.data?.backupCodes ?? null);
      toast.success("2FA actief");
    });
  };

  const finish = () => {
    if (mode === "forced") {
      router.replace(safeNext(next));
      router.refresh();
    } else if (onDone) {
      onDone();
    } else {
      router.refresh();
    }
  };

  const copySecret = async () => {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload.secret);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Kopiëren mislukt");
    }
  };

  if (initLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Bezig met genereren…
      </div>
    );
  }

  if (backupCodes) {
    return (
      <div className="flex flex-col gap-5">
        <div className="rounded-xl border border-[oklch(0.7_0.13_150)]/40 bg-[oklch(0.7_0.13_150)]/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-[oklch(0.45_0.14_150)]">
            <ShieldCheck className="size-4" /> 2FA actief
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Bewaar deze backup-codes op een veilige plek (wachtwoord-manager).
            Je ziet ze nu één keer. Elke code werkt eenmalig en is alleen
            bedoeld als je geen toegang tot je authenticator-app meer hebt.
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-4 font-mono text-sm tabular-nums">
          {backupCodes.map((c) => (
            <li key={c} className="text-center">
              {c}
            </li>
          ))}
        </ul>
        <Button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(backupCodes.join("\n")).catch(() => {});
            toast.success("Codes gekopieerd");
          }}
          variant="outline"
        >
          Kopieer alle codes
        </Button>
        <Button type="button" onClick={finish}>
          Klaar — verder
        </Button>
      </div>
    );
  }

  if (!payload) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        Setup kon niet worden gestart. Probeer opnieuw in te loggen.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <ol className="flex flex-col gap-3 text-sm">
        <li>
          <span className="font-medium">1.</span> Open je authenticator-app
          (Google Authenticator, 1Password, Authy, …)
        </li>
        <li>
          <span className="font-medium">2.</span> Scan de QR-code of plak de
          secret-key handmatig
        </li>
      </ol>
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-4">
        <Image
          src={payload.qrDataUrl}
          alt="2FA QR-code"
          width={200}
          height={200}
          unoptimized
        />
        <div className="flex w-full items-center gap-2">
          <Input
            readOnly
            value={payload.secret}
            className="font-mono text-xs tabular-nums"
            aria-label="Secret-key"
          />
          <button
            type="button"
            onClick={copySecret}
            className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-background hover:bg-accent"
            aria-label="Kopieer secret"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="code">3. Voer de 6-cijferige code uit je app in</Label>
        <Input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          required
          pattern="[0-9]{6}"
        />
      </div>
      <Button type="submit" disabled={pending || code.length !== 6} className="h-11 w-full">
        {pending && <Loader2 className="size-4 animate-spin" />}
        Bevestigen
      </Button>
    </form>
  );
}
