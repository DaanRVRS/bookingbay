import Link from "next/link";
import { Search, Building2 } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { db } from "@/lib/db";

export const metadata = { title: "Organisaties" };

interface PageProps {
  searchParams: Promise<{ q?: string; plan?: string }>;
}

export default async function AdminOrgsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const plan = params.plan;

  const orgs = await db.organization.findMany({
    where: {
      ...(q && {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
          { customDomain: { contains: q, mode: "insensitive" } },
        ],
      }),
      ...(plan && { plan: plan as "STARTER" | "PROFESSIONAL" | "BUSINESS" | "ENTERPRISE" }),
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { memberships: true, items: true, bookings: true, leads: true } },
    },
    take: 100,
  });

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Organisaties</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {orgs.length} {orgs.length === 1 ? "resultaat" : "resultaten"} weergegeven (max 100)
            </p>
          </div>
          <form action="/admin/organizations" className="flex w-full max-w-md gap-2 sm:w-auto">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Zoek op naam, slug of domein"
                className="block h-10 w-full rounded-md border border-border bg-card pr-3 pl-9 text-sm outline-none focus:ring-3 focus:ring-primary/20"
              />
            </div>
            <select
              name="plan"
              defaultValue={plan ?? ""}
              className="h-10 rounded-md border border-border bg-card px-2 text-sm outline-none"
            >
              <option value="">Alle plans</option>
              <option value="STARTER">Starter</option>
              <option value="PROFESSIONAL">Professional</option>
              <option value="BUSINESS">Business</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
          </form>
        </div>

        {orgs.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center text-sm text-muted-foreground">
            <Building2 className="mr-2 inline size-4" />
            Geen organisaties met deze filters.
          </p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2">Organisatie</th>
                  <th className="px-4 py-2">Plan</th>
                  <th className="px-4 py-2 text-right">Leden</th>
                  <th className="px-4 py-2 text-right">Items</th>
                  <th className="px-4 py-2 text-right">Boekingen</th>
                  <th className="px-4 py-2 text-right">Leads</th>
                  <th className="px-4 py-2">Aangemaakt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orgs.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/organizations/${o.id}`}
                        className="flex items-center gap-2 font-medium hover:underline"
                      >
                        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-[10px] font-semibold text-primary uppercase">
                          {o.name.slice(0, 2)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate">{o.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            /{o.slug}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase">
                        {o.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{o._count.memberships}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{o._count.items}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{o._count.bookings}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{o._count.leads}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {format(o.createdAt, "d MMM yyyy", { locale: nl })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
