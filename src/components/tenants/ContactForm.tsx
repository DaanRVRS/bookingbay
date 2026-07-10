"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/auth/FormField";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { leadSchema, type LeadInput } from "@/lib/leads/schemas";
import type { ActionResult } from "@/lib/auth/schemas";

interface Props {
  organizationId: string;
  accent: string;
}

export function ContactForm({ organizationId, accent }: Props) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LeadInput>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      organizationId,
      itemId: "",
      name: "",
      email: "",
      phone: "",
      message: "",
      startAt: "",
      endAt: "",
      website: "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      // Publieke API-route i.p.v. Server Action — deploy-stabiel in een
      // cross-domain iframe (geen action-ID version-skew).
      let res: ActionResult;
      try {
        const r = await fetch("/api/public/lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        res = (await r.json()) as ActionResult;
      } catch {
        toast.error("Verbinding mislukt. Probeer het opnieuw.");
        return;
      }
      if (!res.ok) {
        if (res.fieldErrors) {
          for (const [k, v] of Object.entries(res.fieldErrors)) {
            setError(k as keyof LeadInput, { message: v });
          }
        }
        toast.error(res.error);
        return;
      }
      setDone(true);
    });
  });

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <span
          className="grid size-14 place-items-center rounded-full text-white"
          style={{ background: accent }}
        >
          <CheckCircle2 className="size-7" />
        </span>
        <h3 className="text-xl font-semibold tracking-tight">Bedankt voor je bericht</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          We hebben je bericht ontvangen en nemen zo snel mogelijk contact met je op.
          Check je spamfolder voor de zekerheid.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <input type="hidden" {...register("organizationId")} />

      {/* Honeypot — visually hidden, off-screen, untabbable, autocomplete=off */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      >
        <label>
          Website (laat leeg)
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            {...register("website")}
          />
        </label>
      </div>

      <FormField
        label="Je naam"
        autoFocus
        autoComplete="name"
        placeholder="Voor- en achternaam"
        error={errors.name?.message}
        {...register("name")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="E-mailadres"
          type="email"
          autoComplete="email"
          placeholder="jij@voorbeeld.nl"
          error={errors.email?.message}
          {...register("email")}
        />
        <FormField
          label="Telefoon (optioneel)"
          type="tel"
          autoComplete="tel"
          placeholder="06 12 34 56 78"
          error={errors.phone?.message}
          {...register("phone")}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="message">Bericht</Label>
        <Textarea
          id="message"
          rows={5}
          placeholder="Waar kunnen we je mee helpen?"
          aria-invalid={Boolean(errors.message)}
          {...register("message")}
        />
        {errors.message?.message && (
          <p className="text-xs font-medium text-destructive">{errors.message.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="h-12 w-full text-white sm:w-auto sm:self-start"
        style={{ background: accent }}
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Verstuur bericht
      </Button>
    </form>
  );
}
