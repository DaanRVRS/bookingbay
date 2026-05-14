"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  FileText,
  Inbox,
  Layers,
  LifeBuoy,
  MessageSquareQuote,
  Package,
  Puzzle,
  ScrollText,
  Settings,
  Users,
  UserCog,
  Globe,
  HomeIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: (path: string) => boolean;
  badge?: number;
}

export interface SidebarCounts {
  /** Aantal nog niet-afgehandelde leads (handledAt = null). */
  openLeads?: number;
  /** Aantal tickets waar de klant op moet reageren (AWAITING_USER). */
  ticketsNeedingAttention?: number;
}

export function Sidebar({ counts }: { counts?: SidebarCounts }) {
  const pathname = usePathname();

  const primary: NavItem[] = [
    { href: "/dashboard", label: "Overzicht", icon: HomeIcon, match: (p) => p === "/dashboard" },
    { href: "/dashboard/calendar", label: "Planning", icon: Calendar },
    { href: "/dashboard/bookings", label: "Boekingen", icon: CheckCircle2 },
    { href: "/dashboard/leads", label: "Leads", icon: Inbox, badge: counts?.openLeads },
    { href: "/dashboard/customers", label: "Klanten", icon: Users },
  ];

  const catalog: NavItem[] = [
    { href: "/dashboard/items", label: "Items", icon: Package },
    { href: "/dashboard/categories", label: "Categorieën", icon: Layers },
  ];

  const settings: NavItem[] = [
    {
      href: "/dashboard/site",
      label: "Klantsite",
      icon: Globe,
      match: (p) => p === "/dashboard/site",
    },
    { href: "/dashboard/site/pages", label: "Pagina's", icon: FileText },
    { href: "/dashboard/widgets", label: "Widgets", icon: Puzzle },
    { href: "/dashboard/reviews", label: "Reviews", icon: MessageSquareQuote },
    { href: "/dashboard/team", label: "Team", icon: UserCog },
    { href: "/dashboard/audit", label: "Activiteitenlog", icon: ScrollText },
    { href: "/dashboard/settings", label: "Instellingen", icon: Settings },
    {
      href: "/dashboard/support",
      label: "Support",
      icon: LifeBuoy,
      badge: counts?.ticketsNeedingAttention,
    },
  ];

  return (
    <nav className="flex flex-col gap-6 px-3 py-4 text-sm">
      <NavGroup items={primary} pathname={pathname} />
      <NavGroup label="Catalogus" items={catalog} pathname={pathname} />
      <NavGroup label="Configuratie" items={settings} pathname={pathname} />
    </nav>
  );
}

function NavGroup({
  label,
  items,
  pathname,
}: {
  label?: string;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {label && (
        <p className="px-3 pb-1.5 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
          {label}
        </p>
      )}
      {items.map((item) => {
        const active = item.match
          ? item.match(pathname)
          : pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 transition-colors",
              active
                ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary shadow-[inset_2px_0_0] shadow-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span
                className={`ml-auto grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/15 text-primary"
                }`}
              >
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
