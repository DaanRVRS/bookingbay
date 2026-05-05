"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminDeleteOrgAction } from "@/lib/admin/actions";

export function AdminOrgDeleteForm({
  organizationId,
  organizationName,
}: {
  organizationId: string;
  organizationName: string;
}) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [pending, start] = useTransition();

  const matches = confirmation.trim().toLowerCase() === organizationName.toLowerCase();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matches) return;
    start(async () => {
      const res = await adminDeleteOrgAction(organizationId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Organisatie verwijderd");
      router.push("/admin/organizations");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium text-muted-foreground">
          Typ <strong className="font-mono">{organizationName}</strong> om te
          bevestigen
        </span>
        <input
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          className="h-9 rounded-md border border-destructive/40 bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-destructive/30"
        />
      </label>
      <div>
        <Button
          type="submit"
          variant="destructive"
          disabled={!matches || pending}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
          Verwijder organisatie
        </Button>
      </div>
    </form>
  );
}
