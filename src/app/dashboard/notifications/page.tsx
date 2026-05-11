import { Bell } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import {
  getUnreadCount,
  listNotificationsForUser,
} from "@/lib/notifications/queries";
import { MarkAllReadButton } from "./mark-all-read-button";
import { NotificationList } from "./notification-list";

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
          <NotificationList
            items={items.map((n) => ({
              id: n.id,
              title: n.title,
              body: n.body,
              ctaUrl: n.ctaUrl,
              ctaLabel: n.ctaLabel,
              readAt: n.readAt?.toISOString() ?? null,
              createdAt: n.createdAt.toISOString(),
              createdBy: n.createdBy
                ? {
                    name: n.createdBy.name ?? null,
                    email: n.createdBy.email,
                  }
                : null,
            }))}
          />
        )}
      </div>
    </div>
  );
}
