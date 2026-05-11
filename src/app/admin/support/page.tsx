import Link from "next/link";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { LifeBuoy, MessageCircle } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import {
  countOpenTicketsForAdmin,
  listTicketsForAdmin,
} from "@/lib/support/queries";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TICKET_CATEGORIES,
} from "@/lib/support/schemas";

export const metadata = { title: "Support" };

interface PageProps {
  searchParams: Promise<{ status?: string; q?: string }>;
}

const CATEGORY_LABEL = Object.fromEntries(
  TICKET_CATEGORIES.map((c) => [c.value, c.label]),
);

const STATUS_FILTERS = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Afgerond" },
  { value: "all", label: "Alle" },
];

export default async function AdminSupportPage({ searchParams }: PageProps) {
  await requireAdmin();
  const sp = await searchParams;
  const status = (sp.status ?? "open") as "open" | "closed" | "all";

  const [tickets, openCount] = await Promise.all([
    listTicketsForAdmin({ status, q: sp.q }),
    countOpenTicketsForAdmin(),
  ]);

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-start gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <LifeBuoy className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Support</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <strong>{openCount}</strong> open tickets. Klik een ticket aan om
              te reageren of de status te wijzigen.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1">
            {STATUS_FILTERS.map((f) => {
              const params = new URLSearchParams();
              if (f.value !== "open") params.set("status", f.value);
              if (sp.q) params.set("q", sp.q);
              const active = status === f.value;
              return (
                <Link
                  key={f.value}
                  href={`/admin/support${params.toString() ? "?" + params.toString() : ""}`}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                </Link>
              );
            })}
          </div>

          <form className="ml-auto">
            <input type="hidden" name="status" value={status} />
            <input
              type="search"
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Zoek op onderwerp of organisatie…"
              className="h-9 w-64 rounded-lg border border-input bg-background px-3 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            />
          </form>
        </div>

        <div className="mt-6">
          {tickets.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center text-sm text-muted-foreground">
              Geen tickets in deze weergave.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {tickets.map((t) => (
                <li
                  key={t.id}
                  className="rounded-xl border border-border bg-card transition-shadow hover:shadow-sm"
                >
                  <Link
                    href={`/admin/support/${t.id}`}
                    className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-medium text-primary">
                          {STATUS_LABELS[t.status]}
                        </span>
                        <span className="text-[10px] tracking-wide uppercase text-muted-foreground">
                          {CATEGORY_LABEL[t.category] ?? t.category}
                        </span>
                        {t.priority !== "NORMAL" && t.priority !== "LOW" && (
                          <span className="text-[10px] font-semibold tracking-wide uppercase text-destructive">
                            {PRIORITY_LABELS[t.priority]}
                          </span>
                        )}
                        <span className="text-[10px] tracking-wide uppercase text-muted-foreground">
                          {t.organization.name}
                        </span>
                      </div>
                      <p className="mt-1.5 truncate text-sm font-semibold tracking-tight">
                        {t.subject}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        <span>
                          van{" "}
                          {t.createdBy?.name ?? t.createdBy?.email ?? "—"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle className="size-3" />
                          {t._count.messages}
                        </span>
                        <span>
                          {format(
                            parseISO(t.lastMessageAt.toISOString()),
                            "d MMM HH:mm",
                            { locale: nl },
                          )}
                        </span>
                      </div>
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
