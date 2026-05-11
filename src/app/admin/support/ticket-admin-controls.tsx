"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        Status
        <select
          value={status}
          disabled={pending}
          onChange={(e) => update({ status: e.target.value as Status })}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          {TICKET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        Prioriteit
        <select
          value={priority}
          disabled={pending}
          onChange={(e) => update({ priority: e.target.value as Priority })}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
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
