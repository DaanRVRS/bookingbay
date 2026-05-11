"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { replyTicketAction } from "@/lib/support/actions";

export function ReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    startTransition(async () => {
      const res = await replyTicketAction({ ticketId, body });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Bericht verstuurd");
      setBody("");
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
    >
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={5}
        maxLength={5000}
        placeholder="Schrijf een reply…"
        required
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={pending || !body.trim()}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          <Send className="size-4" />
          Verstuur
        </Button>
      </div>
    </form>
  );
}
