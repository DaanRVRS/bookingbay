"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { submitContentReportAction } from "./actions";

export function ReportForm({ site, initialUrl }: { site: string; initialUrl: string }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [url, setUrl] = useState(initialUrl);
  const [description, setDescription] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [goodFaith, setGoodFaith] = useState(false);
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    startTransition(async () => {
      const res = await submitContentReportAction({
        url,
        description,
        reporterName,
        reporterEmail,
        goodFaith: goodFaith as true,
        site,
        website,
      });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
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
        <h2 className="text-xl font-semibold tracking-tight">Melding ontvangen</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Bedankt. We beoordelen je melding zonder onnodige vertraging.
          {reporterEmail
            ? " Je ontvangt een ontvangstbevestiging met kenmerk per e-mail, en daarna de uitkomst."
            : " Omdat je geen e-mailadres hebt opgegeven, kunnen we je niet over de uitkomst informeren."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rp-url">Link naar de pagina of afbeelding</Label>
        <Input
          id="rp-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          maxLength={500}
          placeholder="https://voorbeeld.bookingbay.nl/pagina"
          required
          aria-invalid={errors.url ? "true" : undefined}
        />
        {errors.url && <p className="text-xs font-medium text-destructive">{errors.url}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rp-description">Wat klopt er niet, en waarom?</Label>
        <Textarea
          id="rp-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          maxLength={4000}
          placeholder="Beschrijf zo concreet mogelijk welke inhoud het betreft en waarom die volgens jou onrechtmatig is (bijv. jouw foto zonder toestemming, jouw naam in een review, misleidende informatie)."
          required
          aria-invalid={errors.description ? "true" : undefined}
        />
        {errors.description && (
          <p className="text-xs font-medium text-destructive">{errors.description}</p>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rp-name">
            Je naam{" "}
            <span className="text-xs font-normal text-muted-foreground">(optioneel)</span>
          </Label>
          <Input
            id="rp-name"
            value={reporterName}
            onChange={(e) => setReporterName(e.target.value)}
            maxLength={120}
            autoComplete="name"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rp-email">
            Je e-mailadres{" "}
            <span className="text-xs font-normal text-muted-foreground">
              (optioneel, voor de uitkomst)
            </span>
          </Label>
          <Input
            id="rp-email"
            type="email"
            value={reporterEmail}
            onChange={(e) => setReporterEmail(e.target.value)}
            maxLength={200}
            autoComplete="email"
            aria-invalid={errors.reporterEmail ? "true" : undefined}
          />
          {errors.reporterEmail && (
            <p className="text-xs font-medium text-destructive">{errors.reporterEmail}</p>
          )}
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-background p-3">
        <input
          type="checkbox"
          checked={goodFaith}
          onChange={(e) => setGoodFaith(e.target.checked)}
          className="mt-0.5 size-4 rounded border-border accent-primary"
          required
        />
        <span className="text-sm">
          Ik verklaar dat ik deze melding te goeder trouw doe en dat de
          informatie erin naar mijn beste weten juist en volledig is.
        </span>
      </label>
      {errors.goodFaith && (
        <p className="text-xs font-medium text-destructive">{errors.goodFaith}</p>
      )}

      {/* Honeypot — verborgen voor mensen, vangt bots */}
      <div
        aria-hidden
        className="absolute -left-[5000px] -top-[5000px] h-0 w-0 overflow-hidden"
      >
        <Label htmlFor="rp-website">Website (laat leeg)</Label>
        <Input
          id="rp-website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        Je gegevens gebruiken we alleen om de melding te behandelen en je over
        de uitkomst te informeren (zie onze{" "}
        <a className="underline" href="/privacy">
          privacyverklaring
        </a>
        ). Meld je namens een organisatie of als rechthebbende, vermeld dat
        dan in de omschrijving.
      </p>

      <Button type="submit" disabled={pending || !url || !description || !goodFaith}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Melding versturen
      </Button>
    </form>
  );
}
