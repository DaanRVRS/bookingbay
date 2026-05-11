"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { adminUpdateTicketAction } from "@/lib/support/actions";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from "@/lib/support/schemas";

type Status = (typeof TICKET_STATUSES)[number];
type Priority = (typeof TICKET_PRIORITIES)[number];

export function TicketAdminControls({
  ticketId,
  status,
  priority,
}: {
  ticketId: string;
  status: Status;
  priority: Priority;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const update = (patch: { status?: Status; priority?: Priority }) => {
    startTransition(async () => {
      const res = await adminUpdateTicketAction({ ticketId, ...patch });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Bijgewerkt");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:min-w-[280px]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
          Ticket-beheer
        </p>
        {pending && (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        )}
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-medium tracking-wide uppercase text-muted-foreground">
          Status
        </span>
        <select
          value={status}
          disabled={pending}
          onChange={(e) => update({ status: e.target.value as Status })}
          className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm font-medium"
        >
          {TICKET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-medium tracking-wide uppercase text-muted-foreground">
          Prioriteit
        </span>
        <select
          value={priority}
          disabled={pending}
          onChange={(e) => update({ priority: e.target.value as Priority })}
          className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm font-medium"
        >
          {TICKET_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
