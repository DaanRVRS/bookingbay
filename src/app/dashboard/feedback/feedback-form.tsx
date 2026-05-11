"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { submitFeedbackAction } from "@/lib/feedback/actions";

export function FeedbackForm({
  source,
}: {
  source: "signup-prompt" | "voluntary";
}) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 && comment.trim().length === 0) {
      toast.error("Geef een rating of een toelichting");
      return;
    }
    startTransition(async () => {
      const res = await submitFeedbackAction({
        rating,
        comment,
        source,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Bedankt voor je feedback");
      setSubmitted(true);
      router.refresh();
    });
  };

  if (submitted) {
    return (
      <div className="rounded-xl border border-[oklch(0.7_0.13_150)]/40 bg-[oklch(0.7_0.13_150)]/5 p-6 text-center">
        <p className="text-base font-semibold text-[oklch(0.45_0.14_150)]">
          Dank je wel — feedback ontvangen.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          We lezen alles en pakken het op waar nodig.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/dashboard")}
        >
          Naar dashboard
        </Button>
      </div>
    );
  }

  const display = hover > 0 ? hover : rating;

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6"
    >
      <div className="flex flex-col gap-2">
        <Label>Hoe bevalt het tot nu toe?</Label>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = n <= display;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                aria-label={`${n} ster${n === 1 ? "" : "ren"}`}
                className="rounded-md p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`size-7 ${
                    active
                      ? "fill-[oklch(0.7_0.16_60)] text-[oklch(0.7_0.16_60)]"
                      : "text-muted-foreground/50"
                  }`}
                />
              </button>
            );
          })}
          {rating > 0 && (
            <button
              type="button"
              onClick={() => setRating(0)}
              className="ml-2 text-xs text-muted-foreground hover:text-foreground"
            >
              wissen
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="comment">Toelichting (optioneel)</Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={6}
          maxLength={2000}
          placeholder="Wat ging soepel? Wat zou je anders willen? Bugs?"
        />
      </div>

      <Button type="submit" disabled={pending} className="self-start">
        {pending && <Loader2 className="size-4 animate-spin" />}
        Verstuur
      </Button>
    </form>
  );
}
