"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarRange,
  FolderTree,
  LayoutDashboard,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function OrgSubNav({ organizationId }: { organizationId: string }) {
  const pathname = usePathname();
  const base = `/admin/organizations/${organizationId}`;
  const tabs = [
    { href: base, label: "Overzicht", icon: LayoutDashboard, exact: true },
    { href: `${base}/customers`, label: "Klanten", icon: Users },
    { href: `${base}/categories`, label: "Categorieën", icon: FolderTree },
    { href: `${base}/bookings`, label: "Boekingen", icon: CalendarRange },
  ];

  return (
    <nav className="mt-5 flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1 text-sm">
      {tabs.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <tab.icon className="size-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
