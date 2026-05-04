"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ChevronRight, MoreHorizontal, Package } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CategoryDialog } from "./category-dialog";
import { deleteCategoryAction } from "@/lib/categories/actions";

interface Cat {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  itemCount: number;
  childCount: number;
}

export function CategoryTree({ categories }: { categories: Cat[] }) {
  if (categories.length === 0) return null;

  const roots = categories.filter((c) => !c.parentId);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <ul className="divide-y divide-border">
        {roots.map((root) => (
          <CategoryRow
            key={root.id}
            cat={root}
            categories={categories}
            depth={0}
          />
        ))}
      </ul>
    </div>
  );
}

function CategoryRow({
  cat,
  categories,
  depth,
}: {
  cat: Cat;
  categories: Cat[];
  depth: number;
}) {
  const children = categories.filter((c) => c.parentId === cat.id);
  const [open, setOpen] = useState(true);

  return (
    <li>
      <div
        className="flex items-center gap-2 py-3 pr-3 sm:gap-3 sm:pr-5"
        style={{ paddingLeft: `${0.75 + Math.min(depth, 4) * 1}rem` }}
      >
        {children.length > 0 ? (
          <button
            onClick={() => setOpen((v) => !v)}
            className="grid size-6 place-items-center text-muted-foreground hover:text-foreground"
            aria-label={open ? "Inklappen" : "Uitklappen"}
          >
            <ChevronRight
              className={`size-4 transition-transform ${open ? "rotate-90" : ""}`}
            />
          </button>
        ) : (
          <span className="size-6" aria-hidden />
        )}

        <span className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary">
          <Package className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{cat.name}</p>
          {cat.description && (
            <p className="truncate text-xs text-muted-foreground">{cat.description}</p>
          )}
        </div>

        <span className="hidden text-xs text-muted-foreground sm:inline">
          {cat.itemCount} {cat.itemCount === 1 ? "item" : "items"}
        </span>

        <CategoryActions cat={cat} categories={categories} />
      </div>

      {open && children.length > 0 && (
        <ul className="border-t border-border bg-muted/20">
          {children.map((child) => (
            <CategoryRow key={child.id} cat={child} categories={categories} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

function CategoryActions({ cat, categories }: { cat: Cat; categories: Cat[] }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const onConfirmDelete = () => {
    startTransition(async () => {
      const res = await deleteCategoryAction(cat.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Categorie verwijderd");
      setDeleteOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent">
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Bewerken
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setDeleteOpen(true)}
            className="text-destructive"
          >
            <Trash2 className="size-4" />
            Verwijderen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CategoryDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        existing={{
          id: cat.id,
          name: cat.name,
          description: cat.description ?? "",
          parentId: cat.parentId,
        }}
        categories={categories.map((c) => ({ id: c.id, name: c.name, parentId: c.parentId }))}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Categorie verwijderen?</DialogTitle>
            <DialogDescription>
              "{cat.name}" wordt definitief verwijderd. Items en subcategorieën blijven bestaan, maar
              moeten apart worden verplaatst of opgeruimd.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Annuleren
            </Button>
            <Button variant="destructive" onClick={onConfirmDelete} disabled={pending}>
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
