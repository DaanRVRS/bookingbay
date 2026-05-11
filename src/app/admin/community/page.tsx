import Link from "next/link";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { MessageSquareHeart, Sparkles, Vote } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { listPollsForAdmin } from "@/lib/polls/queries";
import {
  getFeedbackStats,
  listFeedbackForAdmin,
} from "@/lib/feedback/queries";

export const metadata = { title: "Community" };

export default async function AdminCommunityPage() {
  await requireAdmin();
  const [polls, recentFeedback, stats] = await Promise.all([
    listPollsForAdmin(),
    listFeedbackForAdmin().then((rows) => rows.slice(0, 8)),
    getFeedbackStats(),
  ]);

  const openPolls = polls.filter((p) => p.status === "open").length;

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-start gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Community</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Polls uitsturen + feedback van klanten lezen.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat icon={Vote} label="Open polls" value={openPolls} />
          <Stat
            icon={MessageSquareHeart}
            label="Feedback totaal"
            value={stats.total}
          />
          <Stat
            icon={MessageSquareHeart}
            label="Gem. rating"
            value={stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—"}
            hint="0 = geen ratings"
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between pb-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Vote className="size-4" /> Polls
              </h2>
              <Link
                href="/admin/community/polls"
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Alle →
              </Link>
            </div>
            {polls.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Nog geen polls.{" "}
                <Link
                  href="/admin/community/polls"
                  className="text-primary hover:underline"
                >
                  Maak er één
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {polls.slice(0, 6).map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/admin/community/polls/${p.id}`}
                      className="-mx-2 flex items-center gap-3 rounded-md px-2 py-3 text-sm hover:bg-accent/40"
                    >
                      <span
                        className={`size-2 shrink-0 rounded-full ${
                          p.status === "open"
                            ? "bg-primary"
                            : p.status === "closed"
                              ? "bg-muted-foreground/60"
                              : "bg-[oklch(0.7_0.16_60)]"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {p.title}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {p.status === "draft"
                            ? "Concept"
                            : p.status === "open"
                              ? "Open"
                              : "Gesloten"}{" "}
                          · {p._count.votes}{" "}
                          {p._count.votes === 1 ? "stem" : "stemmen"}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {format(p.createdAt, "d MMM", { locale: nl })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between pb-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquareHeart className="size-4" /> Recente feedback
              </h2>
              <Link
                href="/admin/community/feedback"
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Alles →
              </Link>
            </div>
            {recentFeedback.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Nog geen feedback ontvangen.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recentFeedback.map((f) => (
                  <li key={f.id} className="py-3 text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate font-medium">
                        {f.user.name ?? f.user.email}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {format(f.createdAt, "d MMM HH:mm", { locale: nl })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {f.rating > 0 && `${f.rating} ster · `}
                      {f.source === "signup-prompt"
                        ? "na signup"
                        : "vrijwillig"}
                    </p>
                    {f.comment && (
                      <p className="mt-1 line-clamp-2 text-foreground/90">
                        {f.comment}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between text-muted-foreground">
        <p className="text-xs font-medium tracking-wide uppercase">{label}</p>
        <Icon className="size-4" />
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
