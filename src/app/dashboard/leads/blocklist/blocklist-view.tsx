"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, Mail, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import { removeLeadBlockAction } from "@/lib/leads/blocklist-actions";

interface Block {
  id: string;
  pattern: string;
  reason: string | null;
  createdAt: string;
}

export function BlocklistView({ blocks }: { blocks: Block[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (blocks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center text-sm text-muted-foreground">
        Geen adressen op de blocklist. Voeg er één toe om spam te weren.
      </div>
    );
  }

  return (
    <ul
      className={`overflow-hidden rounded-xl border border-border bg-card divide-y divide-border ${
        pending ? "opacity-60" : ""
      }`}
    >
      {blocks.map((b) => {
        const isDomain = b.pattern.startsWith("@");
        return (
          <li key={b.id} className="flex items-center gap-3 px-5 py-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-destructive/10 text-destructive">
              {isDomain ? <Globe className="size-4" /> : <Mail className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{b.pattern}</p>
              <p className="truncate text-xs text-muted-foreground">
                {isDomain ? "Heel domein geblokkeerd" : "Specifiek adres"}
                {b.reason && ` · ${b.reason}`}
              </p>
            </div>
            <span className="hidden text-xs text-muted-foreground sm:block">
              {format(parseISO(b.createdAt), "d MMM yyyy", { locale: nl })}
            </span>
            <button
              type="button"
              onClick={() => {
                startTransition(async () => {
                  const res = await removeLeadBlockAction(b.id);
                  if (!res.ok) {
                    toast.error(res.error);
                    return;
                  }
                  toast.success("Verwijderd van blocklist");
                  router.refresh();
                });
              }}
              className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-destructive"
              aria-label={`Verwijder ${b.pattern} van blocklist`}
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
