"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { voteOnPollAction } from "@/lib/polls/actions";

export function VoteForm({
  pollId,
  options,
  allowMultiple,
}: {
  pollId: string;
  options: string[];
  allowMultiple: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<number[]>([]);
  const [pending, startTransition] = useTransition();

  const toggle = (i: number) => {
    if (allowMultiple) {
      setSelected((cur) =>
        cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i],
      );
    } else {
      setSelected([i]);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selected.length === 0) {
      toast.error("Kies eerst een antwoord");
      return;
    }
    startTransition(async () => {
      const res = await voteOnPollAction({
        pollId,
        optionIndices: selected.sort((a, b) => a - b),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Stem geregistreerd");
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5"
    >
      <ul className="flex flex-col gap-2">
        {options.map((opt, i) => {
          const checked = selected.includes(i);
          return (
            <li key={i}>
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
                  checked
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <input
                  type={allowMultiple ? "checkbox" : "radio"}
                  name="poll-option"
                  checked={checked}
                  onChange={() => toggle(i)}
                  className="size-4 accent-primary"
                />
                <span className="flex-1">{opt}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <Button type="submit" disabled={pending || selected.length === 0}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        Stem versturen
      </Button>
      {allowMultiple && (
        <p className="text-xs text-muted-foreground">
          Je mag meerdere opties aanvinken.
        </p>
      )}
    </form>
  );
}
