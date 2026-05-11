import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Vote } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getPollForUser, safeOptions, tallyVotes } from "@/lib/polls/queries";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { VoteForm } from "./vote-form";

export const metadata = { title: "Poll" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PollDetailPage({ params }: PageProps) {
  const user = await requireUser();
  const { id } = await params;
  const poll = await getPollForUser(id, user.id);
  if (!poll) notFound();

  const options = safeOptions(poll.options);
  if (options.length === 0) redirect("/dashboard/notifications");

  const myVote = poll.votes[0]?.optionIndices as number[] | undefined;
  const hasVoted = !!myVote && myVote.length > 0;
  const closed = poll.status === "closed";

  // Toon resultaten als de gebruiker al heeft gestemd of als de poll dicht is.
  const showResults = hasVoted || closed;

  let counts: number[] = [];
  if (showResults) {
    const allVotes = await db.pollVote.findMany({
      where: { pollId: poll.id },
      select: { optionIndices: true },
    });
    counts = tallyVotes(options, allVotes);
  }
  const totalVotes = counts.reduce((a, b) => a + b, 0);

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title={poll.title}
          description={poll.question}
          back={{ href: "/dashboard/notifications", label: "Notificaties" }}
        />

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {closed ? (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-medium">
              Gesloten
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 font-medium text-primary">
              <Vote className="size-3" /> Open
            </span>
          )}
          {poll.allowMultiple && (
            <span className="rounded-full border border-border px-2 py-0.5">
              Meerdere antwoorden mogelijk
            </span>
          )}
          {poll.publishedAt && (
            <span>
              Gestart{" "}
              {format(poll.publishedAt, "d MMM yyyy", { locale: nl })}
            </span>
          )}
        </div>

        <div className="mt-6">
          {showResults ? (
            <PollResults
              options={options}
              counts={counts}
              total={totalVotes}
              myVote={myVote}
              closed={closed}
            />
          ) : (
            <VoteForm
              pollId={poll.id}
              options={options}
              allowMultiple={poll.allowMultiple}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PollResults({
  options,
  counts,
  total,
  myVote,
  closed,
}: {
  options: string[];
  counts: number[];
  total: number;
  myVote?: number[];
  closed: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      {!closed && myVote && (
        <p className="mb-4 text-xs text-muted-foreground">
          Bedankt voor je stem — hieronder zie je de huidige resultaten.
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {options.map((opt, i) => {
          const n = counts[i] ?? 0;
          const pct = total > 0 ? Math.round((n / total) * 100) : 0;
          const isMine = myVote?.includes(i);
          return (
            <li key={i}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className={isMine ? "font-semibold text-primary" : ""}>
                  {opt}
                  {isMine && (
                    <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wide text-primary/70">
                      jouw stem
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {n} · {pct}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={
                    isMine ? "h-full bg-primary" : "h-full bg-primary/40"
                  }
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">
        Totaal {total} {total === 1 ? "stem" : "stemmen"}
      </p>
    </div>
  );
}
