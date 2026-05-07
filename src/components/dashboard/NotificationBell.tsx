"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/notifications/actions";

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  ctaUrl: string | null;
  ctaLabel: string | null;
  readAt: string | null; // ISO
  createdAt: string;
};

export function NotificationBell({
  unreadCount,
  recent,
}: {
  unreadCount: number;
  recent: NotificationItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onItemClick = (id: string) => {
    startTransition(async () => {
      await markNotificationReadAction(id);
      router.refresh();
    });
  };

  const onMarkAll = () => {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Notificaties"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <p className="text-sm font-semibold">Notificaties</p>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAll}
              disabled={pending}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <Check className="size-3" /> Alles gelezen
            </button>
          )}
        </div>
        {recent.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            Nog geen notificaties.
          </div>
        ) : (
          <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
            {recent.map((n) => {
              const Inner = (
                <div
                  className={`flex flex-col gap-0.5 px-3 py-3 ${n.readAt ? "" : "bg-primary/4"}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium">
                      {!n.readAt && (
                        <span
                          aria-hidden
                          className="mr-1.5 inline-block size-1.5 rounded-full bg-primary align-middle"
                        />
                      )}
                      {n.title}
                    </p>
                    <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                      {formatDistanceToNow(new Date(n.createdAt), {
                        addSuffix: true,
                        locale: nl,
                      })}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {n.body}
                  </p>
                  {n.ctaUrl && n.ctaLabel && (
                    <span className="mt-1 inline-flex items-center text-[11px] font-medium text-primary">
                      {n.ctaLabel} →
                    </span>
                  )}
                </div>
              );
              return (
                <li key={n.id}>
                  {n.ctaUrl ? (
                    <Link
                      href={n.ctaUrl}
                      onClick={() => onItemClick(n.id)}
                      className="block hover:bg-accent"
                    >
                      {Inner}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onItemClick(n.id)}
                      className="block w-full text-left hover:bg-accent"
                    >
                      {Inner}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <div className="border-t border-border px-3 py-2">
          <Link
            href="/dashboard/notifications"
            className="block rounded-md py-1.5 text-center text-xs font-medium text-primary hover:bg-primary/10"
          >
            Bekijk alle notificaties
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
