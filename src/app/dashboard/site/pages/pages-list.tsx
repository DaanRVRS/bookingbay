"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  GripVertical,
  EyeOff,
  ExternalLink,
  HomeIcon,
  Pencil,
  Trash2,
  MoreHorizontal,
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
import { deletePageAction, reorderPagesAction } from "@/lib/pages/actions";

type Item = {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  showInNav: boolean;
  blockCount: number;
};

export function PagesList({ pages, tenantSlug }: { pages: Item[]; tenantSlug: string }) {
  const router = useRouter();
  const [items, setItems] = useState(pages);
  useEffect(() => setItems(pages), [pages]);
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
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);

    startTransition(async () => {
      const res = await reorderPagesAction({ orderedIds: next.map((p) => p.id) });
      if (!res.ok) {
        toast.error(res.error);
        setItems(pages);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ul className="divide-y divide-border">
            {items.map((p) => (
              <PageRow key={p.id} item={p} tenantSlug={tenantSlug} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function PageRow({ item, tenantSlug }: { item: Item; tenantSlug: string }) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const isHome = item.slug === "home";

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: isHome });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
    background: isDragging ? "var(--card)" : undefined,
  };

  const onConfirmDelete = () => {
    startTransition(async () => {
      const res = await deletePageAction(item.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Pagina verwijderd");
      setDeleteOpen(false);
      router.refresh();
    });
  };

  const tenantHref = isHome
    ? `/site/${tenantSlug}`
    : `/site/${tenantSlug}/${item.slug}`;

  return (
    <li ref={setNodeRef} style={style}>
      <div className="flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-5">
        {isHome ? (
          <span
            aria-hidden
            className="grid size-6 place-items-center text-primary"
            title="Home blijft altijd bovenaan"
          >
            <HomeIcon className="size-4" />
          </span>
        ) : (
          <button
            {...attributes}
            {...listeners}
            aria-label="Versleep om te sorteren"
            className="grid size-6 cursor-grab place-items-center text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="size-4" />
          </button>
        )}

        <Link
          href={`/dashboard/site/pages/${item.id}`}
          className="min-w-0 flex-1 truncate"
        >
          <p className="flex items-center gap-2 truncate text-sm font-medium">
            <span className="truncate">{item.title}</span>
            {isHome && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                Home
              </span>
            )}
            {!item.isPublished && !isHome && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                <EyeOff className="size-3" /> Verborgen
              </span>
            )}
            {!item.showInNav && item.isPublished && !isHome && (
              <span className="inline-flex shrink-0 items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                Niet in menu
              </span>
            )}
          </p>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {isHome ? "/" : `/${item.slug}`} · {item.blockCount} blok
            {item.blockCount === 1 ? "" : "ken"}
          </p>
        </Link>

        <a
          href={tenantHref}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground sm:grid"
          aria-label="Bekijk pagina"
        >
          <ExternalLink className="size-4" />
        </a>

        <DropdownMenu>
          <DropdownMenuTrigger className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent">
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => router.push(`/dashboard/site/pages/${item.id}`)}>
              <Pencil className="size-4" /> Bewerken
            </DropdownMenuItem>
            {!isHome && (
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-destructive"
              >
                <Trash2 className="size-4" /> Verwijderen
              </DropdownMenuItem>
            )}
            {isHome && (
              <DropdownMenuItem
                disabled
                className="text-muted-foreground"
                title="Homepagina kan niet verwijderd worden"
              >
                <Trash2 className="size-4" /> Niet verwijderbaar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pagina verwijderen?</DialogTitle>
            <DialogDescription>
              &quot;{item.title}&quot; en alle blokken erin worden definitief verwijderd.
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
    </li>
  );
}
