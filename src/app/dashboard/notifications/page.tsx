import Link from "next/link";
import { Bell, Check } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { requireUser } from "@/lib/auth/session";
import {
  getUnreadCount,
  listNotificationsForUser,
} from "@/lib/notifications/queries";
import { MarkAllReadButton } from "./mark-all-read-button";

export const metadata = { title: "Notificaties" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const [items, unread] = await Promise.all([
    listNotificationsForUser(user.id, 100),
    getUnreadCount(user.id),
  ]);

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between border-b border-border pb-5">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Bell className="size-5 text-muted-foreground" />
              Notificaties
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {unread > 0
                ? `${unread} ongelezen ${unread === 1 ? "bericht" : "berichten"}`
                : "Alles gelezen"}
            </p>
          </div>
          {unread > 0 && <MarkAllReadButton />}
        </div>

        {items.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              Nog geen notificaties — als er nieuws is verschijnt het hier.
            </p>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {items.map((n) => {
              const Inner = (
                <div className="flex flex-col gap-1 px-5 py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      {!n.readAt && (
                        <span
                          aria-hidden
                          className="size-1.5 rounded-full bg-primary"
                        />
                      )}
                      {n.title}
                    </p>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {format(n.createdAt, "d MMM yyyy · HH:mm", { locale: nl })}
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
              return (
                <li
                  key={n.id}
                  className={n.readAt ? "" : "bg-primary/4"}
                >
                  {n.ctaUrl ? (
                    <Link href={n.ctaUrl} className="block hover:bg-accent">
                      {Inner}
                    </Link>
                  ) : (
                    Inner
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
