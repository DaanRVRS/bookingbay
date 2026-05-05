import Link from "next/link";
import { Building2, ChevronLeft, LayoutDashboard, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { Logo } from "@/components/marketing/Logo";
import { AdminNav } from "./admin-nav";

export const metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border bg-[oklch(0.18_0.02_250)] text-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2.5">
            <Logo showWordmark={false} />
            <span className="text-sm font-semibold tracking-tight">
              Admin <span className="text-white/50">·</span> BookingBay
            </span>
          </Link>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase">
            Platform
          </span>

          <div className="ml-auto flex items-center gap-3 text-xs">
            <span className="text-white/60">{me.email}</span>
            <Link
              href="/dashboard"
              className="inline-flex h-8 items-center gap-1 rounded-md border border-white/20 px-2.5 text-white/80 hover:bg-white/5"
            >
              <ChevronLeft className="size-3.5" />
              Naar mijn dashboard
            </Link>
          </div>
        </div>
        <AdminNav />
      </header>

      <main className="flex-1 bg-muted/30">{children}</main>
    </div>
  );
}

export const ADMIN_TABS = [
  { href: "/admin", label: "Overzicht", icon: LayoutDashboard, exact: true },
  { href: "/admin/organizations", label: "Organisaties", icon: Building2 },
  { href: "/admin/users", label: "Gebruikers", icon: Users },
];
