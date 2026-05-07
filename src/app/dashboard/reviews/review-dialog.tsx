"use client";

import { useEffect, useState, useTransition, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star } from "lucide-react";
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
import {
  createReviewAction,
  updateReviewAction,
} from "@/lib/reviews/actions";

interface InitialReview {
  id: string;
  quote: string;
  author: string;
  role: string | null;
  rating: number;
  isPublished: boolean;
}

/**
 * Two usage modes:
 * 1. With `trigger` prop: dialog manages its own open state, opens when trigger clicked.
 * 2. With `open`/`onOpenChange` props: parent controls open state (e.g. for edit-from-row).
 */
export function ReviewDialog({
  trigger,
  initial,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: {
  trigger?: ReactElement;
  initial?: InitialReview;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const onOpenChange = onOpenChangeProp ?? setInternalOpen;

  const [pending, startTransition] = useTransition();
  const [quote, setQuote] = useState(initial?.quote ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [rating, setRating] = useState<0 | 1 | 2 | 3 | 4 | 5>(
    (initial?.rating as 0 | 1 | 2 | 3 | 4 | 5) ?? 5,
  );
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? true);

  // Reset fields when opening (esp. for "new" use after a successful create)
  useEffect(() => {
    if (open) {
      setQuote(initial?.quote ?? "");
      setAuthor(initial?.author ?? "");
      setRole(initial?.role ?? "");
      setRating((initial?.rating as 0 | 1 | 2 | 3 | 4 | 5) ?? 5);
      setIsPublished(initial?.isPublished ?? true);
    }
  }, [open, initial]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = initial
        ? await updateReviewAction({
            id: initial.id,
            quote,
            author,
            role,
            rating,
            isPublished,
          })
        : await createReviewAction({ quote, author, role, rating, isPublished });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(initial ? "Review bijgewerkt" : "Review toegevoegd");
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>
              {initial ? "Review bewerken" : "Nieuwe review"}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rev-quote">Citaat</Label>
              <Textarea
                id="rev-quote"
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                rows={4}
                maxLength={1000}
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rev-author">Auteur</Label>
                <Input
                  id="rev-author"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  maxLength={80}
                  placeholder="Jan de Vries"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rev-role">Rol/locatie (optioneel)</Label>
                <Input
                  id="rev-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  maxLength={120}
                  placeholder="Vaste klant"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Sterren</Label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n as 1 | 2 | 3 | 4 | 5)}
                    aria-label={`${n} sterren`}
                    className="grid size-8 place-items-center rounded hover:bg-accent"
                  >
                    <Star
                      className="size-5"
                      style={{
                        color: n <= rating ? "var(--primary)" : "var(--border)",
                        fill: n <= rating ? "var(--primary)" : "transparent",
                      }}
                    />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setRating(0)}
                  className="ml-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Geen sterren
                </button>
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background p-3 hover:bg-accent">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="size-4 rounded border-border accent-primary"
              />
              <div>
                <p className="text-sm font-medium">Gepubliceerd</p>
                <p className="text-xs text-muted-foreground">
                  Uitgevinkt = tijdelijk verbergen zonder verwijderen.
                </p>
              </div>
            </label>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={pending || !quote || !author}>
              {pending ? "Opslaan…" : initial ? "Bijwerken" : "Toevoegen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
