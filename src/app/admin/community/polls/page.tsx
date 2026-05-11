import Link from "next/link";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Vote } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { listPollsForAdmin } from "@/lib/polls/queries";
import { NewPollButton } from "./new-poll-button";

export const metadata = { title: "Polls" };

export default async function AdminPollsPage() {
  await requireAdmin();
  const polls = await listPollsForAdmin();

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
              <Vote className="size-6" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Polls</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Stuur een vraag uit naar alle BookingBay-gebruikers. Stem-
                resultaten komen hier samen.
              </p>
            </div>
          </div>
          <NewPollButton />
        </div>

        <div className="mt-8">
          {polls.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center text-sm text-muted-foreground">
              Nog geen polls — klik &ldquo;Nieuwe poll&rdquo; om er één te maken.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {polls.map((p) => (
                <li
                  key={p.id}
                  className="rounded-xl border border-border bg-card transition-shadow hover:shadow-sm"
                >
                  <Link
                    href={`/admin/community/polls/${p.id}`}
                    className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={p.status} />
                        {p.allowMultiple && (
                          <span className="text-[10px] tracking-wide uppercase text-muted-foreground">
                            Multi-choice
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 truncate text-sm font-semibold tracking-tight">
                        {p.title}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {p._count.votes} {p._count.votes === 1 ? "stem" : "stemmen"}{" "}
                        · door{" "}
                        {p.createdBy?.name ?? p.createdBy?.email ?? "—"}{" "}
                        · {format(p.createdAt, "d MMM HH:mm", { locale: nl })}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    draft: {
      label: "Concept",
      cls: "bg-[oklch(0.95_0.06_70)] text-[oklch(0.45_0.13_70)]",
    },
    open: {
      label: "Open",
      cls: "bg-primary/12 text-primary",
    },
    closed: {
      label: "Gesloten",
      cls: "bg-muted text-muted-foreground",
    },
  };
  const c = cfg[status] ?? cfg.draft;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${c.cls}`}
    >
      {c.label}
    </span>
  );
}
