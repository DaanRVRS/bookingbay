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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPageAction } from "@/lib/pages/actions";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function NewPageDialog({
  trigger,
  disabled,
}: {
  trigger: React.ReactNode;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [touched, setTouched] = useState(false);
  const [pending, startTransition] = useTransition();

  const onTitleChange = (v: string) => {
    setTitle(v);
    if (!touched) setSlug(slugify(v));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createPageAction({ title, slug });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Pagina aangemaakt");
      setOpen(false);
      setTitle("");
      setSlug("");
      setTouched(false);
      if (res.data?.id) {
        router.push(`/dashboard/site/pages/${res.data.id}`);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !disabled && setOpen(v)}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Nieuwe pagina</DialogTitle>
            <DialogDescription>
              Geef je pagina een titel — de slug bepaalt de URL.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="page-title">Titel</Label>
              <Input
                id="page-title"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="Over ons"
                autoFocus
                required
                maxLength={120}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="page-slug">Slug</Label>
              <Input
                id="page-slug"
                value={slug}
                onChange={(e) => {
                  setTouched(true);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="over-ons"
                required
                pattern="[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
                maxLength={60}
              />
              <p className="text-[11px] text-muted-foreground">
                Verschijnt als <span className="font-mono">/{slug || "slug"}</span> op je site.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={pending || !title || !slug}>
              {pending ? "Aanmaken…" : "Aanmaken"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
