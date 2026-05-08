"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, Mail, MessageCircle, Phone, Plus, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createInteractionAction } from "@/lib/admin/crm/actions";

const TYPES = [
  { value: "call", label: "Telefoon", icon: Phone },
  { value: "email", label: "E-mail", icon: Mail },
  { value: "meeting", label: "Afspraak", icon: Calendar },
  { value: "note", label: "Notitie", icon: StickyNote },
] as const;

export function CrmInteractionForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("call");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border bg-background/40 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Plus className="size-3.5" /> Interactie loggen
      </button>
    );
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createInteractionAction({
        organizationId,
        type,
        subject,
        body,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Interactie gelogd");
      setOpen(false);
      setSubject("");
      setBody("");
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-2 rounded-md border border-border bg-background p-3"
    >
      <div className="flex flex-wrap gap-1">
        {TYPES.map((t) => {
          const Icon = t.icon;
          const active = type === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon className="size-3" /> {t.label}
            </button>
          );
        })}
      </div>
      <Input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        maxLength={160}
        placeholder="Korte titel — bv. 'Gebeld over verlenging'"
        required
      />
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={4000}
        placeholder="Notities (optioneel) — wat is besproken, vervolgacties…"
      />
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setOpen(false);
            setSubject("");
            setBody("");
          }}
        >
          Annuleren
        </Button>
        <Button type="submit" size="sm" disabled={pending || !subject}>
          {pending ? "Opslaan…" : "Loggen"}
        </Button>
      </div>
    </form>
  );
}
