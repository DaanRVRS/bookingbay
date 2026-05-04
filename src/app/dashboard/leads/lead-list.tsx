"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Mail,
  MoreHorizontal,
  Phone,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
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
import { markLeadHandledAction, deleteLeadAction } from "@/lib/leads/dashboard-actions";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  itemId: string | null;
  itemName: string | null;
  startAt: string | null;
  endAt: string | null;
  handledAt: string | null;
  createdAt: string;
}

const FILTERS = [
  { value: "open", label: "Open" },
  { value: "handled", label: "Afgehandeld" },
  { value: "all", label: "Alle" },
];

export function LeadList({
  leads,
  currentFilter,
  openCount,
  totalCount,
}: {
  leads: Lead[];
  currentFilter: string;
  openCount: number;
  totalCount: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const setFilter = (value: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (value === "open") sp.delete("filter");
    else sp.set("filter", value);
    startTransition(() => router.replace(`/dashboard/leads?${sp.toString()}`));
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1 sm:w-max">
        {FILTERS.map((f) => {
          const active = currentFilter === f.value;
          const count = f.value === "open" ? openCount : f.value === "handled" ? totalCount - openCount : totalCount;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
              <span className="rounded-md bg-background px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {leads.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center text-sm text-muted-foreground">
          Geen leads in deze weergave.
        </p>
      ) : (
        <ul className={`mt-5 flex flex-col gap-3 ${pending ? "opacity-60" : ""}`}>
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </ul>
      )}
    </>
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isHandled = !!lead.handledAt;

  const onToggle = () => {
    startTransition(async () => {
      const res = await markLeadHandledAction(lead.id, !isHandled);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(isHandled ? "Heropend" : "Gemarkeerd als afgehandeld");
      router.refresh();
    });
  };

  const onDelete = () => {
    startTransition(async () => {
      const res = await deleteLeadAction(lead.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Lead verwijderd");
      setDeleteOpen(false);
      router.refresh();
    });
  };

  return (
    <li
      className={`overflow-hidden rounded-xl border bg-card transition-shadow ${
        isHandled ? "border-border/60 opacity-70" : "border-border hover:shadow-sm"
      }`}
    >
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold tracking-tight">{lead.name}</p>
            {isHandled ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.7_0.13_150)]/15 px-2 py-0.5 text-[10px] font-medium text-[oklch(0.5_0.14_150)]">
                <CheckCircle2 className="size-3" /> Afgehandeld
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-medium text-primary">
                <Clock className="size-3" /> Open
              </span>
            )}
          </div>

          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <a
              href={`mailto:${lead.email}`}
              className="flex items-center gap-1 hover:text-foreground"
            >
              <Mail className="size-3" /> {lead.email}
            </a>
            {lead.phone && (
              <a
                href={`tel:${lead.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-1 hover:text-foreground"
              >
                <Phone className="size-3" /> {lead.phone}
              </a>
            )}
            <span>
              {format(parseISO(lead.createdAt), "d MMM HH:mm", { locale: nl })}
            </span>
          </div>

          {(lead.itemName || lead.startAt) && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {lead.itemName && (
                <span className="rounded-md bg-muted/60 px-2 py-1">
                  Item: <span className="font-medium text-foreground">{lead.itemName}</span>
                </span>
              )}
              {lead.startAt && (
                <span className="rounded-md bg-muted/60 px-2 py-1">
                  {format(parseISO(lead.startAt), "d MMM HH:mm", { locale: nl })}
                  {lead.endAt && " — " + format(parseISO(lead.endAt), "d MMM HH:mm", { locale: nl })}
                </span>
              )}
            </div>
          )}

          <p className="mt-3 max-w-prose text-sm leading-relaxed whitespace-pre-line text-foreground/90">
            {lead.message}
          </p>
        </div>

        <div className="flex flex-row-reverse items-start gap-2 sm:flex-col sm:items-end">
          <DropdownMenu>
            <DropdownMenuTrigger className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent">
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {lead.itemId && (
                <DropdownMenuItem
                  onSelect={() => router.push(`/dashboard/bookings/new?item=${lead.itemId}`)}
                >
                  Boek dit item
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={onToggle}>
                {isHandled ? (
                  <>
                    <RotateCcw className="size-4" />
                    Heropen
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" />
                    Markeer afgehandeld
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDeleteOpen(true)} className="text-destructive">
                <Trash2 className="size-4" />
                Verwijderen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant={isHandled ? "outline" : "default"}
            onClick={onToggle}
            disabled={pending}
            className="hidden sm:inline-flex"
          >
            {isHandled ? "Heropen" : "Afgehandeld"}
          </Button>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lead verwijderen?</DialogTitle>
            <DialogDescription>
              De aanvraag van {lead.name} wordt definitief verwijderd. Dit kan niet ongedaan worden
              gemaakt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Annuleren
            </Button>
            <Button variant="destructive" onClick={onDelete} disabled={pending}>
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}
