"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePageMetaAction } from "@/lib/pages/actions";

type PageMeta = {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  showInNav: boolean;
};

export function PageMetaDialog({
  page,
  open,
  onOpenChange,
}: {
  page: PageMeta;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [isPublished, setIsPublished] = useState(page.isPublished);
  const [showInNav, setShowInNav] = useState(page.showInNav);
  const [pending, startTransition] = useTransition();
  const isHome = page.slug === "home";

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updatePageMetaAction({
        id: page.id,
        title,
        slug,
        isPublished,
        showInNav,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Pagina-instellingen opgeslagen");
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Pagina-instellingen</DialogTitle>
            <DialogDescription>Naam, URL en zichtbaarheid van de pagina.</DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="meta-title">Titel</Label>
              <Input
                id="meta-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                required
              />
            </div>
            {!isHome && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="meta-slug">Slug</Label>
                <Input
                  id="meta-slug"
                  value={slug}
                  onChange={(e) =>
                    setSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, "-")
                        .replace(/-{2,}/g, "-"),
                    )
                  }
                  pattern="[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
                  maxLength={60}
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  URL: <span className="font-mono">/{slug || "slug"}</span>
                </p>
              </div>
            )}
            {isHome && (
              <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Dit is de homepagina — slug en publicatie staan vast op{" "}
                <span className="font-mono">/</span>.
              </p>
            )}
            {!isHome && (
              <ToggleField
                label="Gepubliceerd"
                description="Uitgevinkt = pagina is alleen voor jou zichtbaar."
                checked={isPublished}
                onChange={setIsPublished}
              />
            )}
            <ToggleField
              label="In navigatie tonen"
              description="Verschijnt in de menubalk van je site."
              checked={showInNav}
              onChange={setShowInNav}
            />
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={pending || !title || !slug}>
              {pending ? "Opslaan…" : "Opslaan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-background p-3 hover:bg-accent">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 rounded border-border accent-primary"
      />
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </label>
  );
}
