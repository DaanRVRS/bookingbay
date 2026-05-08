"use client";

import { useState, useTransition, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProspectAction } from "@/lib/admin/prospects/actions";

const SOURCES = [
  { value: "website", label: "Website / contact-form" },
  { value: "referral", label: "Doorverwijzing" },
  { value: "cold-call", label: "Koude acquisitie" },
  { value: "event", label: "Event / beurs" },
  { value: "other", label: "Anders" },
];

export function NewProspectDialog({ trigger }: { trigger: ReactElement }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("website");
  const [notes, setNotes] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createProspectAction({
        name,
        companyName,
        email,
        phone,
        source,
        notes,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Prospect aangemaakt");
      setOpen(false);
      setName("");
      setCompanyName("");
      setEmail("");
      setPhone("");
      setSource("website");
      setNotes("");
      if (res.data?.id) {
        router.push(`/admin/crm/${res.data.id}`);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Nieuwe prospect</DialogTitle>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="np-name">Naam contactpersoon</Label>
                <Input
                  id="np-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={120}
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="np-company">Bedrijfsnaam</Label>
                <Input
                  id="np-company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  maxLength={160}
                  placeholder="Optioneel"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="np-email">E-mail</Label>
                <Input
                  id="np-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={200}
                  placeholder="optioneel — wordt gebruikt voor auto-koppeling bij register"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="np-phone">Telefoon</Label>
                <Input
                  id="np-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={40}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="np-source">Bron</Label>
              <select
                id="np-source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              >
                {SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="np-notes">Notities</Label>
              <Textarea
                id="np-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                maxLength={4000}
                placeholder="Wat weet je al — context, behoefte, vervolgactie…"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={pending || !name}>
              {pending ? "Opslaan…" : "Aanmaken"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
