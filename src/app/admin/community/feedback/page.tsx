import Link from "next/link";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { MessageSquareHeart, Star } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import {
  getFeedbackStats,
  listFeedbackForAdmin,
} from "@/lib/feedback/queries";

export const metadata = { title: "Feedback" };

interface PageProps {
  searchParams: Promise<{ source?: string }>;
}

export default async function AdminFeedbackPage({ searchParams }: PageProps) {
  await requireAdmin();
  const sp = await searchParams;
  const filter = sp.source ?? "all";
  const [rows, stats] = await Promise.all([
    listFeedbackForAdmin(filter === "all" ? undefined : { source: filter }),
    getFeedbackStats(),
  ]);

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-start gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <MessageSquareHeart className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Feedback</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {stats.total} antwoorden ·{" "}
              {stats.avgRating > 0
                ? `${stats.avgRating.toFixed(1)}/5 gemiddeld`
                : "nog geen ratings"}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1 sm:w-max">
          <FilterTab href="/admin/community/feedback" label="Alles" active={filter === "all"} />
          <FilterTab
            href="/admin/community/feedback?source=signup-prompt"
            label="Signup-prompt"
            active={filter === "signup-prompt"}
          />
          <FilterTab
            href="/admin/community/feedback?source=voluntary"
            label="Vrijwillig"
            active={filter === "voluntary"}
          />
        </div>

        <div className="mt-6">
          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center text-sm text-muted-foreground">
              Geen feedback in deze weergave.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {rows.map((f) => {
                const org = f.user.memberships[0]?.organization;
                return (
                  <li
                    key={f.id}
                    className="rounded-xl border border-border bg-card p-5"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          {f.user.name ?? f.user.email}
                          {f.user.name && (
                            <span className="ml-1.5 font-normal text-xs text-muted-foreground">
                              {f.user.email}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {org ? (
                            <Link
                              href={`/admin/organizations/${org.id}`}
                              className="text-foreground hover:underline"
                            >
                              {org.name}
                            </Link>
                          ) : (
                            "geen organisatie"
                          )}
                          <span className="mx-1.5">·</span>
                          {f.source === "signup-prompt"
                            ? "na signup"
                            : f.source === "voluntary"
                              ? "vrijwillig"
                              : f.source}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {format(f.createdAt, "d MMM yyyy HH:mm", { locale: nl })}
                      </span>
                    </div>
                    {f.rating > 0 && (
                      <div className="mt-3 flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`size-4 ${
                              n <= f.rating
                                ? "fill-[oklch(0.7_0.16_60)] text-[oklch(0.7_0.16_60)]"
                                : "text-muted-foreground/40"
                            }`}
                          />
                        ))}
                        <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                          {f.rating}/5
                        </span>
                      </div>
                    )}
                    {f.comment && (
                      <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                        {f.comment}
                      </p>
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

function FilterTab({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}
