"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Box,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  ExternalLink,
  GalleryHorizontal,
  GripVertical,
  HelpCircle,
  Image as ImageLucide,
  ImagesIcon,
  LayoutDashboard,
  Loader2,
  MapPin,
  Megaphone,
  Minus,
  MousePointerClick,
  PlayCircle,
  Plus,
  Quote,
  Rows3,
  Settings,
  Sparkles,
  Tag,
  Trash2,
  Type,
} from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import {
  BLOCK_DESCRIPTIONS,
  BLOCK_LABELS,
  makeDefaultBlock,
  type Block,
  type BlockType,
} from "@/lib/pages/blocks";
import { updatePageBlocksAction } from "@/lib/pages/actions";
import { HeroBlockView } from "@/components/tenants/blocks/HeroBlockView";
import { TextBlockView } from "@/components/tenants/blocks/TextBlockView";
import { CtaBlockView } from "@/components/tenants/blocks/CtaBlockView";
import { SpacerBlockView } from "@/components/tenants/blocks/SpacerBlockView";
import { ImageStripBlockView } from "@/components/tenants/blocks/ImageStripBlockView";
import { IconRowBlockView } from "@/components/tenants/blocks/IconRowBlockView";
import { GalleryBlockView } from "@/components/tenants/blocks/GalleryBlockView";
import { FaqBlockView } from "@/components/tenants/blocks/FaqBlockView";
import { VideoBlockView } from "@/components/tenants/blocks/VideoBlockView";
import { PriceTableBlockView } from "@/components/tenants/blocks/PriceTableBlockView";
import { TestimonialsBlockView } from "@/components/tenants/blocks/TestimonialsBlockView";
import { OpeningHoursBlockView } from "@/components/tenants/blocks/OpeningHoursBlockView";
import { MapBlockView } from "@/components/tenants/blocks/MapBlockView";
import { ButtonBlockView } from "@/components/tenants/blocks/ButtonBlockView";
import { QuoteBlockView } from "@/components/tenants/blocks/QuoteBlockView";
import { ImageSliderBlockView } from "@/components/tenants/blocks/ImageSliderBlockView";
import { ContainerBlockView } from "@/components/tenants/blocks/ContainerBlockView";
import { BlockEditor } from "./block-editors";
import { PageMetaDialog } from "./page-meta-form";
import type { LucideIcon } from "lucide-react";

const PALETTE: { type: BlockType; icon: LucideIcon }[] = [
  { type: "hero", icon: LayoutDashboard },
  { type: "text", icon: Type },
  { type: "container", icon: Box },
  { type: "slider", icon: Rows3 },
  { type: "imageSlider", icon: GalleryHorizontal },
  { type: "imageStrip", icon: ImageLucide },
  { type: "gallery", icon: ImagesIcon },
  { type: "iconRow", icon: Sparkles },
  { type: "priceTable", icon: Tag },
  { type: "bookingWidget", icon: CalendarCheck },
  { type: "testimonials", icon: Quote },
  { type: "openingHours", icon: Clock },
  { type: "map", icon: MapPin },
  { type: "faq", icon: HelpCircle },
  { type: "video", icon: PlayCircle },
  { type: "quote", icon: Quote },
  { type: "button", icon: MousePointerClick },
  { type: "cta", icon: Megaphone },
  { type: "spacer", icon: Minus },
];

const PALETTE_PREFIX = "palette__" as const;
const END_DROP_ZONE_ID = "__end__";
const TRASH_DROP_ZONE_ID = "__trash__";
const CONTAINER_DROP_PREFIX = "container__";
const CONTAINER_DROP_SUFFIX = "__inside";

function containerDropId(containerId: string) {
  return `${CONTAINER_DROP_PREFIX}${containerId}${CONTAINER_DROP_SUFFIX}`;
}
function parseContainerDropId(id: string): string | null {
  if (!id.startsWith(CONTAINER_DROP_PREFIX)) return null;
  if (!id.endsWith(CONTAINER_DROP_SUFFIX)) return null;
  return id.slice(
    CONTAINER_DROP_PREFIX.length,
    id.length - CONTAINER_DROP_SUFFIX.length,
  );
}

type CategoryRef = { id: string; name: string; parentId: string | null };
export type ReviewRef = {
  id: string;
  author: string;
  quote: string;
  isPublished: boolean;
};
export type ItemRef = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  pricePerHour: number | null;
  pricePerDay: number | null;
  pricePerWeek: number | null;
  deposit: number | null;
  categoryName: string;
};

type PageInit = {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  showInNav: boolean;
  blocks: Block[];
};

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `b_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function Builder({
  page,
  tenantSlug,
  accent,
  categories,
  reviews,
  items,
}: {
  page: PageInit;
  tenantSlug: string;
  accent: string;
  categories: CategoryRef[];
  reviews: ReviewRef[];
  items: ItemRef[];
}) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<Block[]>(page.blocks);
  const [savedBlocks, setSavedBlocks] = useState<Block[]>(page.blocks);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [metaOpen, setMetaOpen] = useState(false);

  const dirty = JSON.stringify(blocks) !== JSON.stringify(savedBlocks);

  // Warn before navigating away with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const insertBlockAt = (type: BlockType, index: number) => {
    const id = newId();
    const block = makeDefaultBlock(type, id);
    const next = [...blocks];
    next.splice(index, 0, block);
    setBlocks(next);
    setSelectedId(id);
    setTimeout(() => {
      document
        .getElementById(`block-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
  };

  const duplicateBlock = (id: string) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const original = blocks[idx];
    const clone = { ...original, id: newId() } as Block;
    const next = [...blocks];
    next.splice(idx + 1, 0, clone);
    setBlocks(next);
    setSelectedId(clone.id);
  };

  const updateBlock = (id: string, patch: Partial<Block>) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)),
    );
  };

  /**
   * Lift a child block out of its container into the top-level blocks list,
   * placed directly after the container itself. Used by the container
   * editor's "Verplaats naar canvas" button.
   */
  const promoteContainerChild = (containerId: string, childId: string) => {
    setBlocks((prev) => {
      const containerIdx = prev.findIndex((b) => b.id === containerId);
      if (containerIdx === -1) return prev;
      const container = prev[containerIdx];
      if (container.type !== "container") return prev;
      const child = container.children.find((c) => c.id === childId);
      if (!child) return prev;
      const updatedContainer: Block = {
        ...container,
        children: container.children.filter((c) => c.id !== childId),
      };
      const next = [...prev];
      next[containerIdx] = updatedContainer;
      next.splice(containerIdx + 1, 0, child as Block);
      return next;
    });
    setSelectedId(childId);
    setTimeout(() => {
      document
        .getElementById(`block-${childId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
  };

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const appendChildToContainer = (containerId: string, type: BlockType) => {
    if (type === "container") return; // no nested containers
    const childId = newId();
    const child = makeDefaultBlock(type, childId);
    if (child.type === "container") return;
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === containerId && b.type === "container"
          ? { ...b, children: [...b.children, child] }
          : b,
      ),
    );
    setSelectedId(containerId);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const [activeDrag, setActiveDrag] = useState<
    { kind: "palette"; type: BlockType } | { kind: "block"; id: string } | null
  >(null);
  // Index where a new (palette) block would be inserted, or where the
  // currently-dragged existing block would land. Used to render a dashed
  // drop indicator between cards. -1 = no current drop target.
  const [dropIndex, setDropIndex] = useState<number>(-1);

  const onDragStart = (event: DragStartEvent) => {
    const aid = String(event.active.id);
    if (aid.startsWith(PALETTE_PREFIX)) {
      setActiveDrag({ kind: "palette", type: aid.slice(PALETTE_PREFIX.length) as BlockType });
    } else {
      setActiveDrag({ kind: "block", id: aid });
    }
  };

  const onDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setDropIndex(-1);
      return;
    }
    const overId = String(over.id);
    // Container/trash drop zones don't show the line indicator
    if (
      overId === TRASH_DROP_ZONE_ID ||
      parseContainerDropId(overId) !== null
    ) {
      setDropIndex(-1);
      return;
    }
    if (overId === END_DROP_ZONE_ID) {
      setDropIndex(blocks.length);
      return;
    }
    const idx = blocks.findIndex((b) => b.id === overId);
    setDropIndex(idx);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null);
    setDropIndex(-1);
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    // Trash zone — delete the dragged block (palette drags are no-ops here)
    if (overId === TRASH_DROP_ZONE_ID) {
      if (!activeId.startsWith(PALETTE_PREFIX)) {
        removeBlock(activeId);
      }
      return;
    }

    // Drop into a container
    const targetContainerId = parseContainerDropId(overId);
    if (targetContainerId) {
      if (activeId.startsWith(PALETTE_PREFIX)) {
        const type = activeId.slice(PALETTE_PREFIX.length) as BlockType;
        appendChildToContainer(targetContainerId, type);
        return;
      }
      // Existing top-level block dragged into a container — move it.
      const moving = blocks.find((b) => b.id === activeId);
      if (!moving || moving.type === "container") return; // no nested containers
      setBlocks((prev) => {
        const withoutMoving = prev.filter((b) => b.id !== activeId);
        return withoutMoving.map((b) =>
          b.id === targetContainerId && b.type === "container"
            ? { ...b, children: [...b.children, moving] }
            : b,
        );
      });
      return;
    }

    // Dragging from the palette = insert a new block at top level
    if (activeId.startsWith(PALETTE_PREFIX)) {
      const type = activeId.slice(PALETTE_PREFIX.length) as BlockType;
      let insertAt = blocks.length;
      if (overId !== END_DROP_ZONE_ID) {
        const overIdx = blocks.findIndex((b) => b.id === overId);
        if (overIdx !== -1) insertAt = overIdx;
      }
      insertBlockAt(type, insertAt);
      return;
    }

    // Reorder within the canvas
    if (activeId === overId) return;
    const oldIndex = blocks.findIndex((b) => b.id === activeId);
    let newIndex: number;
    if (overId === END_DROP_ZONE_ID) {
      newIndex = blocks.length - 1;
    } else {
      newIndex = blocks.findIndex((b) => b.id === overId);
    }
    if (oldIndex === -1 || newIndex === -1) return;
    setBlocks((prev) => arrayMove(prev, oldIndex, newIndex));
  };

  const onSave = () => {
    startTransition(async () => {
      const res = await updatePageBlocksAction({ id: page.id, blocks });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setSavedBlocks(blocks);
      toast.success("Pagina opgeslagen");
      router.refresh();
    });
  };

  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] flex-col">
      {/* Top bar */}
      <div className="sticky top-14 z-10 flex flex-wrap items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
        <Link
          href="/dashboard/site/pages"
          className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Pagina&apos;s
        </Link>
        <div className="mx-2 h-6 w-px bg-border" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{page.title}</p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">/{page.slug}</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {dirty && (
            <span className="hidden rounded-md bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-700 sm:inline dark:text-amber-400">
              Niet opgeslagen
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMetaOpen(true)}
          >
            <Settings className="size-4" />
            <span className="hidden sm:inline">Instellingen</span>
          </Button>
          <a
            href={`/site/${tenantSlug}/${page.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-card px-3 text-sm hover:bg-accent"
          >
            <ExternalLink className="size-4" />
            <span className="hidden sm:inline">Bekijken</span>
          </a>
          <Button type="button" size="sm" onClick={onSave} disabled={pending || !dirty}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Opslaan
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveDrag(null);
          setDropIndex(-1);
        }}
      >
        <div className="flex flex-1 flex-col lg:flex-row">
          {/* Palette */}
          <aside className="border-b border-border bg-card lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
            <div className="p-3 lg:sticky lg:top-[6.75rem]">
              <p className="px-2 pb-2 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                Sleep om toe te voegen
              </p>
              <div className="grid max-h-64 grid-cols-3 gap-1.5 overflow-y-auto sm:grid-cols-4 sm:max-h-56 lg:max-h-none lg:grid-cols-1">
                {PALETTE.map(({ type, icon: Icon }) => (
                  <PaletteItem key={type} type={type} Icon={Icon} />
                ))}
              </div>
              <p className="mt-3 hidden px-2 text-[11px] leading-relaxed text-muted-foreground lg:block">
                Tip: laat los <em>boven</em> een bestaand blok om te tussenvoegen, of in
                de drop-zone onderaan om aan het einde te plakken.
              </p>
            </div>
          </aside>

          {/* Canvas */}
          <div className="min-w-0 flex-1 bg-muted/30 px-2 py-4 sm:px-6 sm:py-6 lg:px-8">
            <div className="mx-auto max-w-3xl">
              <SortableContext
                items={blocks.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="flex flex-col gap-3">
                  {blocks.map((block, idx) => (
                    <li key={block.id} className="contents">
                      <DropIndicator
                        visible={
                          activeDrag !== null &&
                          dropIndex === idx &&
                          // Hide the indicator above the block being dragged
                          // itself, otherwise it looks like it would re-insert
                          // at the same spot.
                          !(activeDrag.kind === "block" && activeDrag.id === block.id)
                        }
                      />
                      <BlockCard
                        block={block}
                        accent={accent}
                        selected={selectedId === block.id}
                        onSelect={() =>
                          setSelectedId((prev) => (prev === block.id ? null : block.id))
                        }
                        onChange={(patch) => updateBlock(block.id, patch)}
                        onRemove={() => removeBlock(block.id)}
                        onDuplicate={() => duplicateBlock(block.id)}
                        onPromoteChild={(childId) =>
                          promoteContainerChild(block.id, childId)
                        }
                        categories={categories}
                        reviews={reviews}
                        items={items}
                      />
                    </li>
                  ))}
                </ul>
              </SortableContext>

              <EndDropZone
                empty={blocks.length === 0}
                showIndicator={
                  activeDrag !== null && dropIndex === blocks.length && blocks.length > 0
                }
              />
            </div>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDrag?.kind === "palette" ? (
            <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-primary shadow-md">
              + {BLOCK_LABELS[activeDrag.type]}
            </div>
          ) : activeDrag?.kind === "block" ? (
            <div className="rounded-xl border border-primary/40 bg-card px-4 py-3 shadow-lg">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {BLOCK_LABELS[
                  blocks.find((b) => b.id === activeDrag.id)?.type ?? "text"
                ]}
              </span>
            </div>
          ) : null}
        </DragOverlay>

        <TrashDropZone
          visible={activeDrag?.kind === "block"}
        />
      </DndContext>

      <PageMetaDialog
        page={{
          id: page.id,
          title: page.title,
          slug: page.slug,
          isPublished: page.isPublished,
          showInNav: page.showInNav,
        }}
        open={metaOpen}
        onOpenChange={setMetaOpen}
      />
    </div>
  );
}

function PaletteItem({ type, Icon }: { type: BlockType; Icon: LucideIcon }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${PALETTE_PREFIX}${type}`,
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      className={`group flex cursor-grab items-start gap-2 rounded-md border border-transparent p-2 text-left transition-colors hover:border-border hover:bg-accent active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium">{BLOCK_LABELS[type]}</p>
        <p className="line-clamp-2 text-[11px] text-muted-foreground">
          {BLOCK_DESCRIPTIONS[type]}
        </p>
      </div>
      <Plus className="ml-auto size-4 shrink-0 self-center text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

function TrashDropZone({ visible }: { visible: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: TRASH_DROP_ZONE_ID });
  return (
    <div
      ref={setNodeRef}
      aria-hidden={!visible}
      className={`fixed bottom-6 right-6 z-50 grid place-items-center rounded-full border-2 border-dashed shadow-lg transition-all duration-200 ${
        visible
          ? "pointer-events-auto opacity-100 scale-100"
          : "pointer-events-none opacity-0 scale-90"
      } ${
        isOver
          ? "size-20 border-destructive bg-destructive text-white"
          : "size-16 border-destructive/60 bg-card text-destructive"
      }`}
    >
      <Trash2
        className={`transition-all ${isOver ? "size-7" : "size-6"}`}
      />
      <span
        className={`absolute -top-7 right-0 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] font-medium text-background transition-opacity ${
          isOver ? "opacity-100" : "opacity-0"
        }`}
      >
        Loslaten om te verwijderen
      </span>
    </div>
  );
}

function ContainerDropZone({
  containerId,
  isEmpty,
}: {
  containerId: string;
  isEmpty: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: containerDropId(containerId),
  });
  return (
    <div
      ref={setNodeRef}
      className={`m-3 rounded-lg border-2 border-dashed text-center transition-colors ${
        isOver
          ? "border-primary bg-primary/10"
          : isEmpty
            ? "border-border bg-muted/30"
            : "border-border/60 bg-background/50"
      } ${isEmpty ? "px-4 py-10" : "px-4 py-3"}`}
    >
      <p
        className={`text-xs font-medium ${
          isOver ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {isOver
          ? "Loslaten om in container te plaatsen"
          : isEmpty
            ? "Sleep een blok hierin"
            : "+ Sleep om aan deze container toe te voegen"}
      </p>
    </div>
  );
}

function DropIndicator({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden
      className={`overflow-hidden transition-all duration-150 ${
        visible ? "h-7 opacity-100" : "h-0 opacity-0"
      }`}
    >
      <div className="relative my-1 h-5 rounded-md border-2 border-dashed border-primary/70 bg-primary/8">
        <span className="absolute -left-1 top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary" />
        <span className="absolute -right-1 top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary" />
      </div>
    </div>
  );
}

function EndDropZone({
  empty,
  showIndicator,
}: {
  empty: boolean;
  showIndicator: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: END_DROP_ZONE_ID });
  const active = isOver || showIndicator;
  return (
    <div
      ref={setNodeRef}
      className={`mt-3 flex flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition-colors ${
        active
          ? "border-primary/70 bg-primary/8"
          : "border-border bg-card/40"
      } ${empty ? "px-6 py-16" : "px-6 py-8"}`}
    >
      <p className={`text-sm font-medium ${active ? "text-primary" : ""}`}>
        {empty
          ? "Sleep een blok hierheen"
          : active
            ? "Loslaten om hier toe te voegen"
            : "Sleep hierheen om aan het einde toe te voegen"}
      </p>
      {empty && (
        <p className="mt-1 max-w-md text-xs text-muted-foreground">
          Of laat een blok los boven deze zone om de positie te kiezen.
        </p>
      )}
    </div>
  );
}

function BlockCard({
  block,
  accent,
  selected,
  onSelect,
  onChange,
  onRemove,
  onDuplicate,
  onPromoteChild,
  categories,
  reviews,
  items,
}: {
  block: Block;
  accent: string;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<Block>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onPromoteChild: (childId: string) => void;
  categories: CategoryRef[];
  reviews: ReviewRef[];
  items: ItemRef[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      id={`block-${block.id}`}
      style={style}
      className={`overflow-hidden rounded-xl border bg-card shadow-sm transition-colors ${
        selected ? "border-primary/60 ring-2 ring-primary/20" : "border-border"
      }`}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border bg-card/80 px-3 py-2">
        <button
          {...attributes}
          {...listeners}
          aria-label="Versleep"
          className="grid size-7 cursor-grab place-items-center text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {BLOCK_LABELS[block.type]}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onSelect}
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium hover:bg-accent"
          >
            {selected ? (
              <>
                <ChevronUp className="size-3" /> Inklappen
              </>
            ) : (
              <>
                <ChevronDown className="size-3" /> Bewerken
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            aria-label="Dupliceren"
            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Copy className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Verwijderen"
            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-background">
        <div className="pointer-events-none scale-[0.95] origin-top">
          <BlockPreview block={block} accent={accent} reviews={reviews} items={items} />
        </div>
      </div>

      {/* Inline drop zone for containers — lets palette items be dragged
          straight in. */}
      {block.type === "container" && (
        <ContainerDropZone
          containerId={block.id}
          isEmpty={block.children.length === 0}
        />
      )}

      {/* Editor */}
      {selected && (
        <div className="border-t border-border bg-card p-4">
          <BlockEditor
            block={block}
            onChange={onChange as (patch: Partial<Block>) => void}
            categories={categories}
            reviews={reviews}
            items={items}
            onPromoteChild={onPromoteChild}
          />
        </div>
      )}
    </li>
  );
}

function BlockPreview({
  block,
  accent,
  reviews,
  items,
}: {
  block: Block;
  accent: string;
  reviews: ReviewRef[];
  items: ItemRef[];
}) {
  switch (block.type) {
    case "hero":
      return <HeroBlockView block={block} accent={accent} />;
    case "text":
      return <TextBlockView block={block} />;
    case "cta":
      return <CtaBlockView block={block} accent={accent} />;
    case "spacer":
      return <SpacerBlockView block={block} />;
    case "imageStrip":
      return <ImageStripBlockView block={block} />;
    case "iconRow":
      return <IconRowBlockView block={block} accent={accent} />;
    case "slider":
      return (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-medium">Slider</p>
          <p className="text-xs text-muted-foreground">
            {block.source === "categories" ? "Categorieën" : "Items"}
            {block.title ? ` · "${block.title}"` : ""}
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            (Preview verschijnt op de live pagina.)
          </p>
        </div>
      );
    case "gallery":
      return <GalleryBlockView block={block} />;
    case "faq":
      return <FaqBlockView block={block} accent={accent} />;
    case "video":
      return <VideoBlockView block={block} />;
    case "priceTable": {
      // Resolve a preview-quality items list from the available items, mirroring
      // what the server-side renderer will do at request time.
      const previewItems =
        block.source === "items"
          ? block.itemIds
              .map((id) => items.find((i) => i.id === id))
              .filter((x): x is ItemRef => Boolean(x))
          : items.filter(
              (i) => !block.categoryId || true, // categoryName check: items don't carry id, so just show all if categoryId set
            );
      // For category mode in preview, we only have categoryName per item but no
      // id; show all items as a rough preview. Server will filter properly.
      return (
        <PriceTableBlockView
          block={block}
          accent={accent}
          resolvedItems={previewItems.slice(0, 8)}
        />
      );
    }
    case "testimonials": {
      // Resolve a preview-quality items list from the available reviews so
      // the canvas shows the actual reviews the user picked, not just the
      // inline fallback.
      const published = reviews.filter((r) => r.isPublished);
      const previewItems =
        block.source === "auto"
          ? published.slice(0, block.limit).map((r) => ({
              quote: r.quote,
              author: r.author,
              role: null,
              rating: 5,
            }))
          : block.source === "manual"
            ? block.reviewIds
                .map((id) => published.find((r) => r.id === id))
                .filter((r): r is ReviewRef => Boolean(r))
                .map((r) => ({
                  quote: r.quote,
                  author: r.author,
                  role: null,
                  rating: 5,
                }))
            : undefined;
      return (
        <TestimonialsBlockView
          block={block}
          accent={accent}
          resolvedItems={previewItems}
        />
      );
    }
    case "openingHours":
      return <OpeningHoursBlockView block={block} accent={accent} />;
    case "map":
      return <MapBlockView block={block} />;
    case "button":
      return <ButtonBlockView block={block} accent={accent} />;
    case "quote":
      return <QuoteBlockView block={block} accent={accent} />;
    case "imageSlider":
      return <ImageSliderBlockView block={block} />;
    case "bookingWidget":
      return (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-medium">Boek-widget</p>
          {block.heading ? (
            <p className="text-xs text-muted-foreground">
              &ldquo;{block.heading}&rdquo;
            </p>
          ) : null}
          <p className="mt-2 text-[11px] text-muted-foreground">
            De volledige boek-widget verschijnt op je live pagina.
          </p>
        </div>
      );
    case "container":
      return (
        <ContainerBlockView block={block} accent={accent}>
          {block.children.map((child) => (
            <div key={child.id}>
              <BlockPreview block={child} accent={accent} reviews={reviews} items={items} />
            </div>
          ))}
        </ContainerBlockView>
      );
  }
}
