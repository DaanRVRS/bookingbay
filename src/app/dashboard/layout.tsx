import { requireOrg } from "@/lib/auth/session";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { OrgSwitcher } from "@/components/dashboard/OrgSwitcher";
import { UserMenu } from "@/components/dashboard/UserMenu";
import { TopBar } from "@/components/dashboard/TopBar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireOrg();

  return (
    <div className="flex min-h-svh flex-col">
      <TopBar
        sidebarContent={<Sidebar />}
        orgSwitcherSlot={
          <OrgSwitcher
            active={ctx.organization}
            activeRole={ctx.membership.role}
            memberships={ctx.allMemberships}
          />
        }
        rightSlot={<UserMenu user={ctx.user} />}
      />

      <div className="flex flex-1">
        <aside className="sticky top-14 hidden h-[calc(100svh-3.5rem)] w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
          <div className="border-b border-border px-3 py-3">
            <OrgSwitcher
              active={ctx.organization}
              activeRole={ctx.membership.role}
              memberships={ctx.allMemberships}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            <Sidebar />
          </div>
          <div className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
            <span className="block truncate">
              Plan: <span className="text-foreground font-medium">{ctx.organization.plan}</span>
            </span>
            <span className="block truncate">{ctx.organization.slug}.bookingbay.nl</span>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
