"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteProspectInteractionAction } from "@/lib/admin/prospects/actions";

export function ProspectInteractionActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onDelete = () => {
    if (!confirm("Interactie verwijderen?")) return;
    startTransition(async () => {
      const res = await deleteProspectInteractionAction(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={pending}
      aria-label="Verwijder"
      className="grid size-7 shrink-0 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      title="Verwijder"
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}
