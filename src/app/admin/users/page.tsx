import { Search, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { AdminToggle } from "./admin-toggle";
import { VerifyEmailButton } from "./verify-button";
import { ImpersonateUserButton } from "./impersonate-button";

export const metadata = { title: "Gebruikers" };

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const me = await requireAdmin();
  const params = await searchParams;
  const q = (params.q ?? "").trim();

  const users = await db.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      _count: { select: { memberships: true } },
    },
  });

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Gebruikers</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {users.length} {users.length === 1 ? "resultaat" : "resultaten"} (max 200)
            </p>
          </div>
          <form action="/admin/users" className="w-full max-w-sm">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Zoek op naam of e-mail"
                className="block h-10 w-full rounded-md border border-border bg-card pr-3 pl-9 text-sm outline-none focus:ring-3 focus:ring-primary/20"
              />
            </div>
          </form>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-2">Gebruiker</th>
                <th className="px-4 py-2">E-mail</th>
                <th className="px-4 py-2 text-right">Lid van</th>
                <th className="px-4 py-2">Verified</th>
                <th className="px-4 py-2">Aangemaakt</th>
                <th className="px-4 py-2 text-right">Platform-admin</th>
                <th className="px-4 py-2 text-right">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => {
                const initials = (u.name ?? u.email)
                  .split(" ")
                  .map((s) => s[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <tr key={u.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                          {initials}
                        </span>
                        <span className="flex items-center gap-1.5 truncate font-medium">
                          {u.name ?? u.email.split("@")[0]}
                          {u.isAdmin && (
                            <ShieldCheck className="size-3.5 text-primary" />
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{u._count.memberships}</td>
                    <td className="px-4 py-3 text-xs">
                      {u.emailVerified ? (
                        <span className="text-[oklch(0.5_0.14_150)]">✓</span>
                      ) : (
                        <VerifyEmailButton userId={u.id} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {format(u.createdAt, "d MMM yyyy", { locale: nl })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <AdminToggle
                        userId={u.id}
                        isAdmin={u.isAdmin}
                        isSelf={u.id === me.id}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.id !== me.id && (
                        <ImpersonateUserButton
                          userId={u.id}
                          userLabel={u.name ?? u.email}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
