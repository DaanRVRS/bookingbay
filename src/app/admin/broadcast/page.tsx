import { Megaphone } from "lucide-react";
import { db } from "@/lib/db";
import { describeAction } from "@/lib/audit/log";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { BroadcastForm } from "./broadcast-form";
import { DeleteBroadcastButton } from "./delete-broadcast-button";

export const metadata = { title: "Broadcast" };

export default async function AdminBroadcastPage() {
  const [recipientCount, recentBroadcasts] = await Promise.all([
    db.user.count({ where: { memberships: { some: {} } } }),
    db.auditLog.findMany({
      where: { action: "admin.broadcast" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        metadata: true,
        actorUserId: true,
      },
    }),
  ]);

  const actorIds = recentBroadcasts
    .map((b) => b.actorUserId)
    .filter((x): x is string => Boolean(x));
  const actors = actorIds.length
    ? await db.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const actorById = new Map(actors.map((a) => [a.id, a]));

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-start gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <Megaphone className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Broadcast</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Stuur een bericht naar alle <strong>{recipientCount}</strong>{" "}
              BookingBay-gebruikers tegelijk. Komt aan in hun notificaties en
              optioneel ook per e-mail.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <BroadcastForm recipientCount={recipientCount} />
        </div>

        <div className="mt-10">
          <h2 className="text-base font-semibold">Recent verstuurd</h2>
          {recentBroadcasts.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Nog geen broadcasts verstuurd.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
              {recentBroadcasts.map((b) => {
                const meta = (b.metadata ?? {}) as {
                  title?: string;
                  recipients?: number;
                  emailsAttempted?: number;
                };
                const actor = b.actorUserId ? actorById.get(b.actorUserId) : null;
                return (
                  <li
                    key={b.id}
                    className="flex flex-wrap items-start gap-3 px-5 py-3 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate font-medium">
                          {meta.title ?? describeAction("admin.broadcast")}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                          {format(b.createdAt, "d MMM HH:mm", { locale: nl })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {meta.recipients ?? 0} ontvangers
                        {typeof meta.emailsAttempted === "number" &&
                          meta.emailsAttempted > 0 &&
                          ` · ${meta.emailsAttempted} e-mails`}
                        {actor && ` · door ${actor.name ?? actor.email}`}
                      </p>
                    </div>
                    {meta.title && (
                      <DeleteBroadcastButton
                        title={meta.title}
                        at={b.createdAt.toISOString()}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
