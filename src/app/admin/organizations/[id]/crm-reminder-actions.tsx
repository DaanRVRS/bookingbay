"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, RotateCcw, Trash2 } from "lucide-react";
import {
  completeReminderAction,
  deleteReminderAction,
  reopenReminderAction,
} from "@/lib/admin/crm/actions";

export function CrmReminderActions({
  id,
  completed,
}: {
  id: string;
  completed: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onComplete = () => {
    startTransition(async () => {
      const res = await completeReminderAction(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Afgerond");
      router.refresh();
    });
  };
  const onReopen = () => {
    startTransition(async () => {
      const res = await reopenReminderAction(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  };
  const onDelete = () => {
    if (!confirm("Reminder verwijderen?")) return;
    startTransition(async () => {
      const res = await deleteReminderAction(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Verwijderd");
      router.refresh();
    });
  };

  return (
    <div className="flex shrink-0 items-center gap-1">
      {completed ? (
        <button
          type="button"
          onClick={onReopen}
          disabled={pending}
          aria-label="Heropen"
          className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Heropen"
        >
          <RotateCcw className="size-3.5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onComplete}
          disabled={pending}
          aria-label="Markeer afgerond"
          className="grid size-7 place-items-center rounded text-[oklch(0.5_0.14_150)] hover:bg-[oklch(0.7_0.13_150)]/15"
          title="Markeer afgerond"
        >
          <Check className="size-3.5" />
        </button>
      )}
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        aria-label="Verwijder"
        className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        title="Verwijder"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}
