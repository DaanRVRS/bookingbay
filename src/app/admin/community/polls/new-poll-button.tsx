"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
import { createPollAction } from "@/lib/polls/actions";

export function NewPollButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [publishNow, setPublishNow] = useState(true);

  const reset = () => {
    setTitle("");
    setQuestion("");
    setOptions(["", ""]);
    setAllowMultiple(false);
    setPublishNow(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = options.map((o) => o.trim()).filter((o) => o.length > 0);
    if (cleaned.length < 2) {
      toast.error("Minimaal 2 niet-lege opties");
      return;
    }
    startTransition(async () => {
      const res = await createPollAction({
        title,
        question,
        options: cleaned,
        allowMultiple,
        publishNow,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        publishNow ? "Poll verstuurd naar gebruikers" : "Poll opgeslagen als concept",
      );
      reset();
      setOpen(false);
      if (res.data?.id) router.push(`/admin/community/polls/${res.data.id}`);
    });
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Nieuwe poll
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nieuwe poll</DialogTitle>
            <DialogDescription>
              Stel een vraag aan alle BookingBay-gebruikers. Publiceer direct
              of bewaar als concept om later te versturen.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">Titel</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={140}
                required
                placeholder="bv. Welke feature mist je het meest?"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="question">Vraag</Label>
              <Textarea
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
                maxLength={400}
                required
                placeholder="Uitleg / context bij de keuzes hieronder."
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Opties (2-6)</Label>
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={opt}
                    onChange={(e) =>
                      setOptions((cur) =>
                        cur.map((o, j) => (j === i ? e.target.value : o)),
                      )
                    }
                    maxLength={140}
                    placeholder={`Optie ${i + 1}`}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() =>
                        setOptions((cur) => cur.filter((_, j) => j !== i))
                      }
                      className="grid size-9 shrink-0 place-items-center rounded-md border border-border text-muted-foreground hover:bg-accent"
                      aria-label="Optie verwijderen"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              ))}
              {options.length < 6 && (
                <button
                  type="button"
                  onClick={() => setOptions((cur) => [...cur, ""])}
                  className="self-start text-xs font-medium text-primary hover:underline"
                >
                  + Voeg optie toe
                </button>
              )}
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-background p-3 hover:bg-accent">
              <input
                type="checkbox"
                checked={allowMultiple}
                onChange={(e) => setAllowMultiple(e.target.checked)}
                className="mt-0.5 size-4 accent-primary"
              />
              <div>
                <p className="text-sm font-medium">Meerdere antwoorden toestaan</p>
                <p className="text-xs text-muted-foreground">
                  Klanten kunnen meerdere opties aanvinken in plaats van één.
                </p>
              </div>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-background p-3 hover:bg-accent">
              <input
                type="checkbox"
                checked={publishNow}
                onChange={(e) => setPublishNow(e.target.checked)}
                className="mt-0.5 size-4 accent-primary"
              />
              <div>
                <p className="text-sm font-medium">Direct publiceren</p>
                <p className="text-xs text-muted-foreground">
                  Uitvinken = opslaan als concept (nog niet zichtbaar voor
                  klanten).
                </p>
              </div>
            </label>
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
                {publishNow ? "Publiceer" : "Bewaar concept"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
