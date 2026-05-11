"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  ScrollText,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin", label: "Overzicht", icon: LayoutDashboard, exact: true, badgeKey: undefined },
  { href: "/admin/organizations", label: "Organisaties", icon: Building2 },
  { href: "/admin/crm", label: "CRM", icon: Target },
  { href: "/admin/support", label: "Support", icon: LifeBuoy, badgeKey: "openTickets" as const },
  { href: "/admin/community", label: "Community", icon: Sparkles },
  { href: "/admin/users", label: "Gebruikers", icon: Users },
  { href: "/admin/broadcast", label: "Broadcast", icon: Megaphone },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
];

export interface AdminNavBadges {
  openTickets?: number;
}

export function AdminNav({ badges }: { badges?: AdminNavBadges }) {
  const pathname = usePathname();
  return (
    <nav className="border-t border-white/10">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 sm:px-5">
        {TABS.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(tab.href + "/");
          const count =
            tab.badgeKey && badges ? badges[tab.badgeKey] : undefined;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors",
                active
                  ? "border-white text-white"
                  : "border-transparent text-white/60 hover:text-white",
              )}
            >
              <tab.icon className="size-3.5" />
              {tab.label}
              {count !== undefined && count > 0 && (
                <span
                  className={cn(
                    "grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
                    active
                      ? "bg-white text-[oklch(0.18_0.02_250)]"
                      : "bg-white/20 text-white",
                  )}
                >
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
