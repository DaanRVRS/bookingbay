"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GripVertical,
  Image as ImageLucide,
  LayoutDashboard,
  Loader2,
  Plus,
  Settings,
  Trash2,
  Type,
  Sparkles,
  Megaphone,
  Rows3,
  Minus,
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
import { BlockEditor } from "./block-editors";
import { PageMetaDialog } from "./page-meta-form";
import type { LucideIcon } from "lucide-react";

const PALETTE: { type: BlockType; icon: LucideIcon }[] = [
  { type: "hero", icon: LayoutDashboard },
  { type: "text", icon: Type },
  { type: "slider", icon: Rows3 },
  { type: "imageStrip", icon: ImageLucide },
  { type: "iconRow", icon: Sparkles },
  { type: "cta", icon: Megaphone },
  { type: "spacer", icon: Minus },
];

type CategoryRef = { id: string; name: string; parentId: string | null };

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
}: {
  page: PageInit;
  tenantSlug: string;
  accent: string;
  categories: CategoryRef[];
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

  const addBlock = (type: BlockType) => {
    const id = newId();
    const next = [...blocks, makeDefaultBlock(type, id)];
    setBlocks(next);
    setSelectedId(id);
    // Scroll the new block into view next tick
    setTimeout(() => {
      document.getElementById(`block-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const updateBlock = (id: string, patch: Partial<Block>) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)),
    );
  };

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
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

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Palette */}
        <aside className="border-b border-border bg-card lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
          <div className="sticky top-[6.75rem] p-3">
            <p className="px-2 pb-2 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
              Voeg een blok toe
            </p>
            <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
              {PALETTE.map(({ type, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addBlock(type)}
                  className="group flex items-start gap-2 rounded-md border border-transparent p-2 text-left transition-colors hover:border-border hover:bg-accent"
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
              ))}
            </div>
          </div>
        </aside>

        {/* Canvas */}
        <div className="min-w-0 flex-1 bg-muted/30 px-3 py-6 sm:px-8">
          <div className="mx-auto max-w-3xl">
            {blocks.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
                <p className="text-sm font-medium">Nog geen blokken</p>
                <p className="max-w-md text-xs text-muted-foreground">
                  Klik links op een blok om er één toe te voegen. Sleep blokken later om te
                  herordenen.
                </p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                onDragEnd={onDragEnd}
              >
                <SortableContext
                  items={blocks.map((b) => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="flex flex-col gap-3">
                    {blocks.map((block) => (
                      <BlockCard
                        key={block.id}
                        block={block}
                        accent={accent}
                        selected={selectedId === block.id}
                        onSelect={() =>
                          setSelectedId((prev) => (prev === block.id ? null : block.id))
                        }
                        onChange={(patch) => updateBlock(block.id, patch)}
                        onRemove={() => removeBlock(block.id)}
                        categories={categories}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>

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

function BlockCard({
  block,
  accent,
  selected,
  onSelect,
  onChange,
  onRemove,
  categories,
}: {
  block: Block;
  accent: string;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<Block>) => void;
  onRemove: () => void;
  categories: CategoryRef[];
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
          <BlockPreview block={block} accent={accent} />
        </div>
      </div>

      {/* Editor */}
      {selected && (
        <div className="border-t border-border bg-card p-4">
          <BlockEditor
            block={block}
            onChange={onChange as (patch: Partial<Block>) => void}
            categories={categories}
          />
        </div>
      )}
    </li>
  );
}

function BlockPreview({ block, accent }: { block: Block; accent: string }) {
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
  }
}
