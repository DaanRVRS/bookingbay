"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminUpdateOrgAction } from "@/lib/admin/actions";

export function AdminOrgEditForm({
  organizationId,
  initialName,
  initialSlug,
}: {
  organizationId: string;
  initialName: string;
  initialSlug: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [pending, start] = useTransition();

  const dirty = name !== initialName || slug !== initialSlug;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty) return;
    start(async () => {
      const res = await adminUpdateOrgAction({ organizationId, name, slug });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Organisatie bijgewerkt");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium text-muted-foreground">Naam</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-primary/20"
          maxLength={80}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium text-muted-foreground">Slug</span>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          className="h-9 rounded-md border border-border bg-background px-3 font-mono text-sm outline-none focus:ring-3 focus:ring-primary/20"
          maxLength={40}
          pattern="[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?"
        />
        <span className="text-[11px] text-muted-foreground">
          Wijzigen breekt eventuele bestaande tenant-URL's voor deze klant.
        </span>
      </label>
      <div>
        <Button type="submit" disabled={!dirty || pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Opslaan
        </Button>
      </div>
    </form>
  );
}
