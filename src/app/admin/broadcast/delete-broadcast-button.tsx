"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteBroadcastAction } from "@/lib/notifications/actions";

export function DeleteBroadcastButton({
  title,
  at,
}: {
  title: string;
  at: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const onConfirm = () => {
    startTransition(async () => {
      const res = await deleteBroadcastAction({ title, at });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        res.data?.deleted
          ? `${res.data.deleted} notificaties verwijderd`
          : "Verwijderd",
      );
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Broadcast verwijderen"
        className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        title="Verwijderen bij alle ontvangers"
      >
        <Trash2 className="size-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Broadcast verwijderen?</DialogTitle>
            <DialogDescription>
              &ldquo;{title}&rdquo; wordt bij <strong>alle</strong> ontvangers uit
              hun notificatie-lijst verwijderd. De audit-log blijft staan, maar
              de e-mails die al verstuurd zijn kunnen we niet terughalen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Annuleren
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirm}
              disabled={pending}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Verwijderen bij iedereen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
