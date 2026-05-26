"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  FileText,
  Hourglass,
  Inbox,
  Layers,
  LifeBuoy,
  Loader2,
  MessageSquareQuote,
  Package,
  Plug,
  Puzzle,
  Repeat,
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
  /** Eager-prefetch — alleen op de heet-gebruikte tabs zetten anders
   * mounten we 13 RSC-renders bij elke dashboard-mount. */
  hot?: boolean;
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
    {
      href: "/dashboard",
      label: "Overzicht",
      icon: HomeIcon,
      match: (p) => p === "/dashboard",
      hot: true,
    },
    { href: "/dashboard/calendar", label: "Planning", icon: Calendar, hot: true },
    { href: "/dashboard/bookings", label: "Boekingen", icon: CheckCircle2, hot: true },
    { href: "/dashboard/recurring", label: "Reeksen", icon: Repeat },
    { href: "/dashboard/waitlist", label: "Wachtlijst", icon: Hourglass },
    { href: "/dashboard/leads", label: "Leads", icon: Inbox, badge: counts?.openLeads, hot: true },
    { href: "/dashboard/customers", label: "Klanten", icon: Users, hot: true },
  ];

  const catalog: NavItem[] = [
    { href: "/dashboard/items", label: "Items", icon: Package, hot: true },
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
    { href: "/dashboard/integrations", label: "Koppelingen", icon: Plug },
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
            prefetch={item.hot ? true : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 transition-colors",
              active
                ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary shadow-[inset_2px_0_0] shadow-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <NavItemContent item={item} active={active} />
          </Link>
        );
      })}
    </div>
  );
}

/**
 * Moet IN de <Link> staan: useLinkStatus leest de link-context. Tijdens
 * een aankomende navigatie (pending) tonen we meteen de active-styling
 * + een mini-spinner, zodat de klik *voelt* instant, ook als de
 * server-render nog 100-300ms duurt.
 */
function NavItemContent({ item, active }: { item: NavItem; active: boolean }) {
  const { pending } = useLinkStatus();
  const showActive = active || pending;

  return (
    <>
      <item.icon
        className={cn(
          "size-4 shrink-0 transition-colors",
          showActive && !active ? "text-primary" : undefined,
        )}
      />
      <span
        className={cn(
          "truncate transition-colors",
          showActive && !active ? "text-primary" : undefined,
        )}
      >
        {item.label}
      </span>
      {pending && (
        <Loader2 className="ml-auto size-3 animate-spin text-primary" />
      )}
      {!pending && item.badge !== undefined && item.badge > 0 && (
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
    </>
  );
}
