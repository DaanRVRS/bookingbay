"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { staffReplyTicketAction } from "@/lib/support/actions";

export function StaffReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    startTransition(async () => {
      const res = await staffReplyTicketAction({ ticketId, body });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Antwoord verzonden — klant krijgt een mail");
      setBody("");
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4"
    >
      <p className="text-xs font-medium tracking-wide uppercase text-primary">
        Reageren als BookingBay-support
      </p>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={6}
        maxLength={5000}
        placeholder="Schrijf een reactie. De klant krijgt automatisch een mailtje."
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
