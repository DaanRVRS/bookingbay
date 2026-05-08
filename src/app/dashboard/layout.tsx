import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { OrgSwitcher } from "@/components/dashboard/OrgSwitcher";
import { UserMenu } from "@/components/dashboard/UserMenu";
import { TopBar } from "@/components/dashboard/TopBar";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { SubscriptionBanner } from "@/components/dashboard/SubscriptionBanner";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { TrialPill } from "@/components/dashboard/TrialPill";
import {
  getUnreadCount,
  listNotificationsForUser,
} from "@/lib/notifications/queries";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireOrg();

  const [billing, unreadCount, recentNotifications] = await Promise.all([
    db.organization.findUnique({
      where: { id: ctx.organization.id },
      select: { paidUntil: true, suspendedAt: true, trialEndsAt: true },
    }),
    getUnreadCount(ctx.user.id),
    listNotificationsForUser(ctx.user.id, 8),
  ]);

  return (
    <div className="flex min-h-svh flex-col">
      <ImpersonationBanner />
      <SubscriptionBanner
        paidUntil={billing?.paidUntil ?? null}
        suspendedAt={billing?.suspendedAt ?? null}
      />
      <TopBar
        sidebarContent={<Sidebar />}
        orgSwitcherSlot={
          <OrgSwitcher
            active={ctx.organization}
            activeRole={ctx.membership.role}
            memberships={ctx.allMemberships}
          />
        }
        rightSlot={
          <>
            <TrialPill
              trialEndsAt={billing?.trialEndsAt ?? null}
              paidUntil={billing?.paidUntil ?? null}
            />
            <NotificationBell
              unreadCount={unreadCount}
              recent={recentNotifications.map((n) => ({
                id: n.id,
                title: n.title,
                body: n.body,
                ctaUrl: n.ctaUrl,
                ctaLabel: n.ctaLabel,
                readAt: n.readAt ? n.readAt.toISOString() : null,
                createdAt: n.createdAt.toISOString(),
              }))}
            />
            <UserMenu user={ctx.user} />
          </>
        }
      />

      <div className="flex flex-1">
        <aside
          className="sticky top-14 hidden h-[calc(100svh-3.5rem)] w-64 shrink-0 flex-col border-r border-border md:flex"
          style={{
            background:
              "linear-gradient(180deg, oklch(0.98 0.015 60) 0%, oklch(0.985 0.008 80) 100%)",
          }}
        >
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
            <span className="block truncate">
              {ctx.organization.slug}.{env.TENANT_DOMAIN}
            </span>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
