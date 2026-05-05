"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CreditCard, ScrollText, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard/settings/profile", label: "Profiel", icon: UserCircle },
  { href: "/dashboard/settings/organization", label: "Organisatie", icon: Building2 },
  { href: "/dashboard/settings/billing", label: "Plan & facturatie", icon: CreditCard },
  { href: "/dashboard/settings/audit", label: "Activiteitenlogboek", icon: ScrollText },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav className="mt-5 flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1 text-sm">
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
