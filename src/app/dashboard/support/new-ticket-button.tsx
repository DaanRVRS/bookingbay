"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
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
import { createTicketAction } from "@/lib/support/actions";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  PRIORITY_LABELS,
} from "@/lib/support/schemas";

export function NewTicketButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] =
    useState<(typeof TICKET_CATEGORIES)[number]["value"]>("general");
  const [priority, setPriority] =
    useState<(typeof TICKET_PRIORITIES)[number]>("NORMAL");

  const reset = () => {
    setSubject("");
    setBody("");
    setCategory("general");
    setPriority("NORMAL");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createTicketAction({
        subject,
        body,
        category,
        priority,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Ticket aangemaakt — we reageren snel");
      setOpen(false);
      reset();
      if (res.data?.ticketId) {
        router.push(`/dashboard/support/${res.data.ticketId}`);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Nieuwe ticket
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nieuwe support-ticket</DialogTitle>
            <DialogDescription>
              Beschrijf zo concreet mogelijk wat er speelt. Screenshots kun je
              later in een reply meesturen.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="subject">Onderwerp</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={160}
                required
                placeholder="bv. Boeking laat zich niet verplaatsen"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="category">Categorie</Label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) =>
                    setCategory(
                      e.target.value as (typeof TICKET_CATEGORIES)[number]["value"],
                    )
                  }
                  className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
                >
                  {TICKET_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="priority">Prioriteit</Label>
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) =>
                    setPriority(
                      e.target.value as (typeof TICKET_PRIORITIES)[number],
                    )
                  }
                  className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
                >
                  {TICKET_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="body">Bericht</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={5000}
                rows={7}
                required
                placeholder="Wat probeer je te doen, wat zie je, wanneer begon het?"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Annuleren
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin" />}
                Verzenden
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
