"use client";

import { useState, useTransition } from "react";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { sendMarketingContactAction } from "./actions";

export function MarketingContactForm({
  initialTopic = "demo",
}: {
  initialTopic?: "demo" | "vraag" | "anders";
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [topic, setTopic] = useState<"demo" | "vraag" | "anders">(initialTopic);
  const [message, setMessage] = useState("");
  // Honeypot
  const [website, setWebsite] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await sendMarketingContactAction({
        name,
        email,
        phone,
        topic,
        message,
        website,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setDone(true);
    });
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-[oklch(0.7_0.13_150)]/15 text-[oklch(0.5_0.14_150)]">
          <CheckCircle2 className="size-7" strokeWidth={2.5} />
        </span>
        <h2 className="text-xl font-semibold tracking-tight">
          Bericht verstuurd
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          We hebben je bericht ontvangen en reageren meestal binnen één
          werkdag. Bedankt!
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mc-name">Naam</Label>
          <Input
            id="mc-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            placeholder="Voor- en achternaam"
            autoComplete="name"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mc-email">E-mail</Label>
          <Input
            id="mc-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={200}
            placeholder="jij@bedrijf.nl"
            autoComplete="email"
            required
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mc-phone">
          Telefoon{" "}
          <span className="text-xs font-normal text-muted-foreground">
            (optioneel)
          </span>
        </Label>
        <Input
          id="mc-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={40}
          placeholder="06 12 34 56 78"
          autoComplete="tel"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Onderwerp</Label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { value: "demo", label: "Demo aanvragen" },
              { value: "vraag", label: "Algemene vraag" },
              { value: "anders", label: "Anders" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTopic(opt.value)}
              className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                topic === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:bg-accent"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mc-message">Bericht</Label>
        <Textarea
          id="mc-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          maxLength={4000}
          placeholder="Vertel kort waar je mee bezig bent en wat je zoekt."
          required
        />
      </div>

      {/* Honeypot — hidden from users, traps bots */}
      <div
        aria-hidden
        className="absolute -left-[5000px] -top-[5000px] h-0 w-0 overflow-hidden"
      >
        <Label htmlFor="mc-website">Website (laat leeg)</Label>
        <Input
          id="mc-website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        Door te versturen ga je akkoord met onze{" "}
        <a className="underline" href="/privacy">
          privacyverklaring
        </a>
        . We sturen geen marketing zonder toestemming.
      </p>

      <Button type="submit" disabled={pending || !name || !email || !message}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        Verstuur
      </Button>
    </form>
  );
}
