"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  deleteAllNotificationsAction,
  deleteNotificationAction,
} from "@/lib/notifications/actions";

export interface NotificationRow {
  id: string;
  title: string;
  body: string;
  ctaUrl: string | null;
  ctaLabel: string | null;
  readAt: string | null;
  createdAt: string;
  createdBy: { name: string | null; email: string } | null;
}

export function NotificationList({ items }: { items: NotificationRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const deleteOne = (id: string) => {
    startTransition(async () => {
      const res = await deleteNotificationAction(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  };

  const deleteAll = () => {
    if (
      !window.confirm(
        "Alle notificaties wissen? Dit kan niet ongedaan worden gemaakt.",
      )
    )
      return;
    startTransition(async () => {
      const res = await deleteAllNotificationsAction();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`${res.data?.deleted ?? 0} notificaties gewist`);
      router.refresh();
    });
  };

  return (
    <>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={deleteAll}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-destructive/40 hover:text-destructive disabled:opacity-50"
        >
          <Trash2 className="size-3.5" />
          Wis alle notificaties
        </button>
      </div>

      <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {items.map((n) => (
          <li key={n.id} className={`group relative ${n.readAt ? "" : "bg-primary/5"}`}>
            {n.ctaUrl ? (
              <Link href={n.ctaUrl} className="block hover:bg-accent">
                <Inner item={n} />
              </Link>
            ) : (
              <Inner item={n} />
            )}
            <button
              type="button"
              onClick={() => deleteOne(n.id)}
              disabled={pending}
              aria-label="Wis melding"
              title="Wis melding"
              className="absolute right-3 top-3 grid size-7 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 disabled:opacity-50"
            >
              <X className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function Inner({ item: n }: { item: NotificationRow }) {
  return (
    <div className="flex flex-col gap-1 px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pr-8">
        <p className="flex items-center gap-2 text-sm font-semibold">
          {!n.readAt && (
            <span aria-hidden className="size-1.5 rounded-full bg-primary" />
          )}
          {n.title}
        </p>
        <span className="text-xs text-muted-foreground tabular-nums">
          {format(new Date(n.createdAt), "d MMM yyyy · HH:mm", { locale: nl })}
        </span>
      </div>
      <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
        {n.body}
      </p>
      {n.createdBy && (
        <p className="text-[11px] text-muted-foreground">
          Door {n.createdBy.name ?? n.createdBy.email}
        </p>
      )}
      {n.ctaUrl && n.ctaLabel && (
        <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary">
          {n.ctaLabel} →
        </span>
      )}
    </div>
  );
}
