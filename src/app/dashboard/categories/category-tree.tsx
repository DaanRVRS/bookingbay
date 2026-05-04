"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Trash2,
  ChevronRight,
  MoreHorizontal,
  Package,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
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
import { deleteCategoryAction, reorderCategoriesAction } from "@/lib/categories/actions";

interface Cat {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  itemCount: number;
  childCount: number;
}

export function CategoryTree({ categories }: { categories: Cat[] }) {
  // Local copy so drag-and-drop can be optimistic
  const [items, setItems] = useState<Cat[]>(categories);
  useEffect(() => setItems(categories), [categories]);

  if (items.length === 0) return null;

  const roots = items.filter((c) => !c.parentId);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <SortableLevel
        parentId={null}
        items={roots}
        allItems={items}
        onItemsChange={setItems}
        depth={0}
      />
    </div>
  );
}

function SortableLevel({
  parentId,
  items,
  allItems,
  onItemsChange,
  depth,
}: {
  parentId: string | null;
  items: Cat[];
  allItems: Cat[];
  onItemsChange: (next: Cat[]) => void;
  depth: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedSiblings = arrayMove(items, oldIndex, newIndex);
    const orderedIds = reorderedSiblings.map((c) => c.id);

    // Optimistic update of the full tree array (replace siblings, preserve rest)
    const otherCats = allItems.filter((c) => (c.parentId ?? null) !== parentId);
    onItemsChange([...otherCats, ...reorderedSiblings]);

    startTransition(async () => {
      const res = await reorderCategoriesAction({ parentId, orderedIds });
      if (!res.ok) {
        toast.error(res.error);
        // Roll back on failure by restoring server state
        onItemsChange(allItems);
        return;
      }
      router.refresh();
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className="divide-y divide-border">
          {items.map((cat) => (
            <CategoryRow
              key={cat.id}
              cat={cat}
              allItems={allItems}
              onItemsChange={onItemsChange}
              depth={depth}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function CategoryRow({
  cat,
  allItems,
  onItemsChange,
  depth,
}: {
  cat: Cat;
  allItems: Cat[];
  onItemsChange: (next: Cat[]) => void;
  depth: number;
}) {
  const children = allItems.filter((c) => c.parentId === cat.id);
  const [open, setOpen] = useState(true);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: cat.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
    background: isDragging ? "var(--card)" : undefined,
  };

  return (
    <li ref={setNodeRef} style={style}>
      <div
        className="flex items-center gap-2 py-3 pr-3 sm:gap-3 sm:pr-5"
        style={{ paddingLeft: `${0.75 + Math.min(depth, 4) * 1}rem` }}
      >
        <button
          {...attributes}
          {...listeners}
          aria-label="Versleep om te sorteren"
          className="grid size-6 cursor-grab place-items-center text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>

        {children.length > 0 ? (
          <button
            type="button"
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

        {cat.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cat.imageUrl}
            alt=""
            className="size-9 shrink-0 rounded-md object-cover"
          />
        ) : (
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <Package className="size-4" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{cat.name}</p>
          {cat.description && (
            <p className="truncate text-xs text-muted-foreground">{cat.description}</p>
          )}
        </div>

        <span className="hidden text-xs text-muted-foreground sm:inline">
          {cat.itemCount} {cat.itemCount === 1 ? "item" : "items"}
        </span>

        <CategoryActions cat={cat} allItems={allItems} />
      </div>

      {open && children.length > 0 && (
        <div className="border-t border-border bg-muted/20">
          <SortableLevel
            parentId={cat.id}
            items={children}
            allItems={allItems}
            onItemsChange={onItemsChange}
            depth={depth + 1}
          />
        </div>
      )}
    </li>
  );
}

function CategoryActions({ cat, allItems }: { cat: Cat; allItems: Cat[] }) {
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
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Bewerken
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
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
          imageUrl: cat.imageUrl,
          parentId: cat.parentId,
        }}
        categories={allItems.map((c) => ({ id: c.id, name: c.name, parentId: c.parentId }))}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Categorie verwijderen?</DialogTitle>
            <DialogDescription>
              &quot;{cat.name}&quot; wordt definitief verwijderd. Items en subcategorieën blijven
              bestaan, maar moeten apart worden verplaatst of opgeruimd.
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
