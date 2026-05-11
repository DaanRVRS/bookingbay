import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import {
  getPollForAdmin,
  safeOptions,
  tallyVotes,
} from "@/lib/polls/queries";
import { PollAdminActions } from "./poll-admin-actions";

export const metadata = { title: "Poll" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminPollDetailPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;
  const poll = await getPollForAdmin(id);
  if (!poll) notFound();

  const options = safeOptions(poll.options);
  const counts = tallyVotes(options, poll.votes);
  const total = counts.reduce((a, b) => a + b, 0);

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/admin/community/polls"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" /> Alle polls
        </Link>

        <div className="mt-3 flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              {poll.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{poll.question}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Door {poll.createdBy?.name ?? poll.createdBy?.email ?? "—"} ·{" "}
              {format(poll.createdAt, "d MMM HH:mm", { locale: nl })}
              {poll.publishedAt && (
                <>
                  {" "}
                  · gestart{" "}
                  {format(poll.publishedAt, "d MMM", { locale: nl })}
                </>
              )}
              {poll.closedAt && (
                <>
                  {" "}
                  · gesloten{" "}
                  {format(poll.closedAt, "d MMM", { locale: nl })}
                </>
              )}
            </p>
          </div>
          <PollAdminActions pollId={poll.id} status={poll.status} />
        </div>

        <div className="mt-6">
          <h2 className="text-sm font-semibold">
            Resultaten — {total} {total === 1 ? "stem" : "stemmen"}
          </h2>
          <ul className="mt-3 flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
            {options.map((opt, i) => {
              const n = counts[i] ?? 0;
              const pct = total > 0 ? Math.round((n / total) * 100) : 0;
              return (
                <li key={i}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span>{opt}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {n} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-8">
          <h2 className="text-sm font-semibold">Wie stemde wat</h2>
          {poll.votes.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-border bg-card/40 px-5 py-6 text-center text-xs text-muted-foreground">
              Nog geen stemmen.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
              {poll.votes.map((v) => {
                const choices = Array.isArray(v.optionIndices)
                  ? (v.optionIndices as number[])
                  : [];
                const labels = choices
                  .map((i) => options[i])
                  .filter((s): s is string => !!s);
                return (
                  <li
                    key={v.id}
                    className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {v.user.name ?? v.user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {labels.join(" · ") || "—"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {format(v.createdAt, "d MMM HH:mm", { locale: nl })}
                    </span>
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
