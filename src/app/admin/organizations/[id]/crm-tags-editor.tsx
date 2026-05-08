"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { setOrgCrmTagsAction } from "@/lib/admin/crm/actions";

export function CrmTagsEditor({
  organizationId,
  initial,
}: {
  organizationId: string;
  initial: string[];
}) {
  const router = useRouter();
  const [tags, setTags] = useState<string[]>(initial);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  const persist = (next: string[]) => {
    startTransition(async () => {
      const res = await setOrgCrmTagsAction(organizationId, next);
      if (!res.ok) {
        toast.error(res.error);
        setTags(initial);
        return;
      }
      router.refresh();
    });
  };

  const addTag = () => {
    const v = draft.trim();
    if (!v) return;
    if (tags.includes(v)) {
      setDraft("");
      return;
    }
    const next = [...tags, v].slice(0, 12);
    setTags(next);
    setDraft("");
    persist(next);
  };

  const removeTag = (t: string) => {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    persist(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
        >
          {t}
          <button
            type="button"
            onClick={() => removeTag(t)}
            disabled={pending}
            aria-label={`Tag ${t} verwijderen`}
            className="grid size-4 place-items-center rounded-full text-primary/70 hover:bg-primary/20 hover:text-primary"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addTag();
        }}
        className="inline-flex items-center gap-1"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="+ tag"
          maxLength={40}
          disabled={pending || tags.length >= 12}
          className="h-7 w-24 rounded-md border border-border bg-background px-2 text-xs"
        />
        <button
          type="submit"
          disabled={pending || !draft.trim() || tags.length >= 12}
          aria-label="Tag toevoegen"
          className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          <Plus className="size-3.5" />
        </button>
      </form>
    </div>
  );
}
