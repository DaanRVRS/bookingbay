"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createProspectReminderAction } from "@/lib/admin/prospects/actions";

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
}

function defaultDueAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ProspectReminderForm({
  prospectId,
  admins,
}: {
  prospectId: string;
  admins: AdminUser[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueAt, setDueAt] = useState(defaultDueAt());
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border bg-background/40 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Plus className="size-3.5" /> Follow-up plannen
      </button>
    );
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createProspectReminderAction({
        prospectId,
        title,
        notes,
        dueAt: new Date(dueAt).toISOString(),
        assignedToUserId: assignedTo || null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Gepland");
      setOpen(false);
      setTitle("");
      setNotes("");
      setDueAt(defaultDueAt());
      setAssignedTo("");
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-2 rounded-md border border-border bg-background p-3"
    >
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        placeholder="Titel — bv. 'Bel terug over offerte'"
        required
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="datetime-local"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          required
          className="h-9 rounded-md border border-border bg-background px-2 text-sm"
        />
        <select
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-2 text-sm"
        >
          <option value="">Niet toegewezen</option>
          {admins.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name ?? a.email}
            </option>
          ))}
        </select>
      </div>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="Context (optioneel)"
      />
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setOpen(false);
            setTitle("");
            setNotes("");
          }}
        >
          Annuleren
        </Button>
        <Button type="submit" size="sm" disabled={pending || !title || !dueAt}>
          {pending ? "Opslaan…" : "Plannen"}
        </Button>
      </div>
    </form>
  );
}
