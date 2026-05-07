"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { broadcastNotificationAction } from "@/lib/notifications/actions";

export function BroadcastForm({ recipientCount }: { recipientCount: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [shouldSendEmail, setShouldSendEmail] = useState(true);

  const submit = () => {
    setConfirmOpen(false);
    startTransition(async () => {
      const res = await broadcastNotificationAction({
        title,
        body,
        ctaUrl,
        ctaLabel,
        sendEmail: shouldSendEmail,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Verstuurd naar ${res.data?.recipients ?? recipientCount} ontvangers${
          res.data?.emailsAttempted ? ` (incl. ${res.data.emailsAttempted} e-mails)` : ""
        }`,
      );
      setTitle("");
      setBody("");
      setCtaUrl("");
      setCtaLabel("");
      router.refresh();
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title || !body) {
            toast.error("Titel en bericht zijn verplicht");
            return;
          }
          setConfirmOpen(true);
        }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bc-title">Titel</Label>
          <Input
            id="bc-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Belangrijke update"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bc-body">Bericht</Label>
          <Textarea
            id="bc-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            maxLength={4000}
            placeholder="Schrijf hier wat je wil delen — meerdere alinea's mag, gewoon enter."
            required
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bc-url">CTA-link (optioneel)</Label>
            <Input
              id="bc-url"
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              maxLength={400}
              placeholder="https://bookingbay.nl/dashboard/settings/billing"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bc-cta">Knop-tekst</Label>
            <Input
              id="bc-cta"
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              maxLength={60}
              placeholder="Bekijk"
            />
          </div>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-background p-3 hover:bg-accent">
          <input
            type="checkbox"
            checked={shouldSendEmail}
            onChange={(e) => setShouldSendEmail(e.target.checked)}
            className="mt-0.5 size-4 rounded border-border accent-primary"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium">Ook per e-mail versturen</p>
            <p className="text-xs text-muted-foreground">
              Uitvinken = bericht alleen in dashboard-notificaties.
            </p>
          </div>
        </label>
        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Wordt verstuurd naar <strong>{recipientCount}</strong> gebruikers.
          </p>
          <Button type="submit" disabled={pending || !title || !body}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            <Send className="size-4" />
            Verstuur
          </Button>
        </div>
      </form>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bericht versturen?</DialogTitle>
            <DialogDescription>
              Dit stuurt &ldquo;{title}&rdquo; naar <strong>{recipientCount}</strong>{" "}
              gebruikers. {shouldSendEmail && "Ook als e-mail."} Niet
              terug te draaien.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Bevestigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
