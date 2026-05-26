"use client";

import { useState, useTransition } from "react";
import { Loader2, Mail } from "lucide-react";

interface Props {
  slug: string;
  initialError?: string;
  initialSent?: boolean;
}

export function LoginForm({ slug, initialError, initialSent }: Props) {
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(Boolean(initialSent));
  const [error, setError] = useState<string | null>(initialError ?? null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const value = email.trim().toLowerCase();
    if (!value) {
      setError("Vul je e-mailadres in");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/portal/request-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, email: value }),
        });
        const data = await res.json();
        if (data.ok) {
          setSent(true);
        } else {
          setError(data.error ?? "Versturen mislukt — probeer 't opnieuw");
        }
      } catch {
        setError("Versturen mislukt — controleer je internetverbinding");
      }
    });
  };

  if (sent) {
    return (
      <div className="rounded-lg border border-border bg-background/50 p-5 text-center">
        <Mail className="mx-auto size-7 text-primary" />
        <p className="mt-3 text-sm font-medium">Check je mail</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Als dit e-mailadres bij ons bekend is, hebben we een link gestuurd.
          De link is 15 minuten geldig.
        </p>
        <button
          type="button"
          className="mt-4 text-xs font-medium text-primary hover:underline"
          onClick={() => {
            setSent(false);
            setEmail("");
            setError(null);
          }}
        >
          Ander e-mailadres proberen
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label htmlFor="portal-email" className="text-xs font-medium">
        E-mailadres
      </label>
      <input
        id="portal-email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="jij@voorbeeld.nl"
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Stuur mij een inlog-link
      </button>
    </form>
  );
}
