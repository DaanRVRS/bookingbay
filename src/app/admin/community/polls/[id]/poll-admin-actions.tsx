"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  closePollAction,
  deletePollAction,
  publishPollAction,
} from "@/lib/polls/actions";

export function PollAdminActions({
  pollId,
  status,
}: {
  pollId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const publish = () => {
    startTransition(async () => {
      const res = await publishPollAction(pollId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Gepubliceerd");
      router.refresh();
    });
  };

  const close = () => {
    startTransition(async () => {
      const res = await closePollAction(pollId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Poll gesloten");
      router.refresh();
    });
  };

  const remove = () => {
    startTransition(async () => {
      const res = await deletePollAction(pollId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Verwijderd");
      router.push("/admin/community/polls");
    });
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {status === "draft" && (
          <Button onClick={publish} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            <Send className="size-4" />
            Publiceer
          </Button>
        )}
        {status === "open" && (
          <Button variant="outline" onClick={close} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            <XCircle className="size-4" />
            Sluit poll
          </Button>
        )}
        <Button
          variant="outline"
          className="text-destructive hover:bg-destructive/10"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="size-4" />
          Verwijder
        </Button>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Poll verwijderen?</DialogTitle>
            <DialogDescription>
              Alle stemmen worden ook gewist. Niet ongedaan te maken.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
            >
              Annuleren
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={remove}
              disabled={pending}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Verwijder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
