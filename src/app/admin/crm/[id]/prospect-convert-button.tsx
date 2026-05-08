"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Link2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { convertProspectToOrgAction } from "@/lib/admin/prospects/actions";

interface OrgRef {
  id: string;
  name: string;
  slug: string;
}

export function ProspectConvertButton({
  prospectId,
  organizations,
}: {
  prospectId: string;
  organizations: OrgRef[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = organizations.filter(
    (o) =>
      o.name.toLowerCase().includes(query.toLowerCase()) ||
      o.slug.toLowerCase().includes(query.toLowerCase()),
  );

  const onConvert = (orgId: string) => {
    startTransition(async () => {
      const res = await convertProspectToOrgAction({
        prospectId,
        organizationId: orgId,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Gekoppeld aan organisatie");
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Link2 className="size-3.5" />
        Koppelen aan org
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prospect koppelen aan organisatie</DialogTitle>
            <DialogDescription>
              Kies een bestaande organisatie. De prospect wordt gemarkeerd als
              gewonnen en de history blijft staan.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-3">
            <Input
              autoFocus
              placeholder="Zoek op naam of slug…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border bg-background">
              {filtered.length === 0 ? (
                <li className="px-3 py-4 text-center text-xs text-muted-foreground">
                  Geen organisaties gevonden.
                </li>
              ) : (
                filtered.slice(0, 50).map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center justify-between px-3 py-2 text-sm hover:bg-accent/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{o.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {o.slug}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onConvert(o.id)}
                      disabled={pending}
                    >
                      {pending && <Loader2 className="size-3.5 animate-spin" />}
                      Koppel
                    </Button>
                  </li>
                ))
              )}
            </ul>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuleren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
