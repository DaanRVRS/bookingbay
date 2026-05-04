"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/auth/FormField";
import { deleteOrgAction } from "@/lib/settings/actions";

export function DangerZone({ orgName }: { orgName: string }) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [pending, startTransition] = useTransition();

  const onConfirm = () => {
    startTransition(async () => {
      const res = await deleteOrgAction({ confirmation });
      // The action redirects on success, so we only land here on failure
      if (res && !res.ok) {
        toast.error(res.error);
        return;
      }
    });
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="border-destructive/40 text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="size-4" />
        Organisatie verwijderen
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Organisatie definitief verwijderen?</DialogTitle>
            <DialogDescription>
              Hierdoor worden <strong>{orgName}</strong>, alle items, klanten, boekingen, leads en
              uploads onomkeerbaar gewist. Dit kan niet ongedaan worden gemaakt.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Typ <strong className="text-foreground">{orgName}</strong> om te bevestigen.
          </p>
          <FormField
            label="Bevestiging"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder={orgName}
            autoComplete="off"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuleren
            </Button>
            <Button
              variant="destructive"
              disabled={
                pending || confirmation.trim().toLowerCase() !== orgName.toLowerCase()
              }
              onClick={onConfirm}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Definitief verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
