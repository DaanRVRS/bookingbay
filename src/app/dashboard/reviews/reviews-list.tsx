"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  EyeOff,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
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
import {
  deleteReviewAction,
  reorderReviewsAction,
} from "@/lib/reviews/actions";
import { ReviewDialog } from "./review-dialog";

type Item = {
  id: string;
  quote: string;
  author: string;
  role: string | null;
  rating: number;
  isPublished: boolean;
  sortOrder: number;
};

export function ReviewsList({ reviews }: { reviews: Item[] }) {
  const router = useRouter();
  const [items, setItems] = useState(reviews);
  useEffect(() => setItems(reviews), [reviews]);
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
      const res = await reorderReviewsAction({ orderedIds: next.map((p) => p.id) });
      if (!res.ok) {
        toast.error(res.error);
        setItems(reviews);
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
            {items.map((r) => (
              <ReviewRow key={r.id} item={r} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function ReviewRow({ item }: { item: Item }) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  const onConfirmDelete = () => {
    startTransition(async () => {
      const res = await deleteReviewAction(item.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Review verwijderd");
      setDeleteOpen(false);
      router.refresh();
    });
  };

  return (
    <li ref={setNodeRef} style={style}>
      <div className="flex items-start gap-3 px-3 py-3 sm:px-5 sm:py-4">
        <button
          {...attributes}
          {...listeners}
          aria-label="Versleep om te sorteren"
          className="mt-1 grid size-6 cursor-grab place-items-center text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {item.rating > 0 && (
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star
                    key={idx}
                    className="size-3.5"
                    style={{
                      color: idx < item.rating ? "var(--primary)" : "var(--border)",
                      fill: idx < item.rating ? "var(--primary)" : "transparent",
                    }}
                  />
                ))}
              </div>
            )}
            {!item.isPublished && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                <EyeOff className="size-3" /> Verborgen
              </span>
            )}
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm">&ldquo;{item.quote}&rdquo;</p>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{item.author}</span>
            {item.role && <> · {item.role}</>}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent">
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" /> Bewerken
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteOpen(true)}
              className="text-destructive"
            >
              <Trash2 className="size-4" /> Verwijderen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ReviewDialog
        initial={item}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review verwijderen?</DialogTitle>
            <DialogDescription>
              De review van <strong>{item.author}</strong> wordt definitief verwijderd.
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
