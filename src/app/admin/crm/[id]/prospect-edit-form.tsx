"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteProspectAction,
  updateProspectAction,
} from "@/lib/admin/prospects/actions";

interface Initial {
  id: string;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  source: string;
  notes: string;
}

export function ProspectEditForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial.name);
  const [companyName, setCompanyName] = useState(initial.companyName);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);
  const [source, setSource] = useState(initial.source);
  const [notes, setNotes] = useState(initial.notes);
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateProspectAction({
        id: initial.id,
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
      toast.success("Bijgewerkt");
      setOpen(false);
      router.refresh();
    });
  };

  const onDelete = () => {
    if (!confirm(`Prospect '${initial.name}' definitief verwijderen?`)) return;
    startDelete(async () => {
      const res = await deleteProspectAction(initial.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Verwijderd");
      router.push("/admin/crm");
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Pencil className="size-3.5" /> Bewerken
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onDelete}
        disabled={deleting}
        className="text-destructive hover:bg-destructive/10"
      >
        {deleting ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Trash2 className="size-3.5" />
        )}
        Verwijderen
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>Prospect bewerken</DialogTitle>
            </DialogHeader>
            <div className="mt-4 flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ed-name">Naam</Label>
                  <Input
                    id="ed-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={120}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ed-company">Bedrijf</Label>
                  <Input
                    id="ed-company"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    maxLength={160}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ed-email">E-mail</Label>
                  <Input
                    id="ed-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={200}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ed-phone">Telefoon</Label>
                  <Input
                    id="ed-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={40}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ed-source">Bron</Label>
                <Input
                  id="ed-source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  maxLength={40}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ed-notes">Notities</Label>
                <Textarea
                  id="ed-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  maxLength={4000}
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit" disabled={pending || !name}>
                {pending ? "Opslaan…" : "Opslaan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
