"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { CheckCircle2, Hourglass, Mail, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  deleteWaitlistEntryAction,
  updateWaitlistStatusAction,
} from "@/lib/waitlist/actions";

type Status = "WAITING" | "NOTIFIED" | "CONVERTED" | "EXPIRED";

interface Entry {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  itemName: string;
  desiredStartAt: string;
  desiredEndAt: string;
  status: Status;
  notifiedAt: string | null;
  notes: string | null;
}

interface Props {
  entries: Entry[];
}

export function WaitlistTable({ entries }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="hidden grid-cols-[1.4fr_1fr_1.4fr_0.8fr_auto] gap-4 border-b border-border bg-muted/30 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:grid">
        <span>Klant</span>
        <span>Item</span>
        <span>Gewenst venster</span>
        <span>Status</span>
        <span className="text-right">Acties</span>
      </div>
      <ul className="divide-y divide-border">
        {entries.map((e) => (
          <Row key={e.id} entry={e} />
        ))}
      </ul>
    </div>
  );
}

function Row({ entry }: { entry: Entry }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const setStatus = (status: Status) => {
    startTransition(async () => {
      const r = await updateWaitlistStatusAction({ id: entry.id, status });
      if (r.ok) {
        toast.success("Status bijgewerkt");
        router.refresh();
      } else {
        toast.error(r.error ?? "Bijwerken mislukt");
      }
    });
  };

  const onDelete = () => {
    if (!confirm("Wachtlijst-entry verwijderen?")) return;
    startTransition(async () => {
      const r = await deleteWaitlistEntryAction(entry.id);
      if (r.ok) {
        toast.success("Verwijderd");
        router.refresh();
      } else {
        toast.error(r.error ?? "Verwijderen mislukt");
      }
    });
  };

  const start = new Date(entry.desiredStartAt);
  const end = new Date(entry.desiredEndAt);

  return (
    <li className="grid grid-cols-1 gap-2 px-5 py-4 text-sm sm:grid-cols-[1.4fr_1fr_1.4fr_0.8fr_auto] sm:items-center sm:gap-4">
      <div className="min-w-0">
        <p className="truncate font-medium">{entry.customerName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {entry.customerEmail}
          {entry.customerPhone ? ` · ${entry.customerPhone}` : ""}
        </p>
      </div>
      <div className="text-xs">{entry.itemName}</div>
      <div className="text-xs text-muted-foreground">
        {format(start, "d MMM, HH:mm", { locale: nl })} —{" "}
        {format(end, "d MMM, HH:mm", { locale: nl })}
        {entry.notes && (
          <p className="mt-1 text-muted-foreground/70">"{entry.notes}"</p>
        )}
      </div>
      <div>
        <StatusPill status={entry.status} />
      </div>
      <div className="flex items-center justify-end gap-1">
        {entry.status === "WAITING" && (
          <button
            type="button"
            onClick={() => setStatus("NOTIFIED")}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-accent"
            title="Markeer als gemeld"
          >
            <Mail className="size-3" />
          </button>
        )}
        {entry.status === "NOTIFIED" && (
          <button
            type="button"
            onClick={() => setStatus("CONVERTED")}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-accent"
            title="Geconverteerd naar boeking"
          >
            <CheckCircle2 className="size-3" />
          </button>
        )}
        {(entry.status === "WAITING" || entry.status === "NOTIFIED") && (
          <button
            type="button"
            onClick={() => setStatus("EXPIRED")}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-accent"
            title="Verlopen"
          >
            <XCircle className="size-3" />
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-destructive hover:bg-destructive/10"
          title="Verwijderen"
        >
          <Trash2 className="size-3" />
        </button>
      </div>
    </li>
  );
}

function StatusPill({ status }: { status: Status }) {
  const map = {
    WAITING: {
      icon: Hourglass,
      label: "Wachtend",
      cls: "bg-muted text-muted-foreground",
    },
    NOTIFIED: {
      icon: Mail,
      label: "Gemeld",
      cls: "bg-primary/10 text-primary",
    },
    CONVERTED: {
      icon: CheckCircle2,
      label: "Geboekt",
      cls: "bg-primary/15 text-primary",
    },
    EXPIRED: {
      icon: XCircle,
      label: "Verlopen",
      cls: "bg-destructive/10 text-destructive",
    },
  } as const;
  const v = map[status];
  const Icon = v.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium ${v.cls}`}
    >
      <Icon className="size-3" />
      {v.label}
    </span>
  );
}
