import { UserPlus } from "lucide-react";
import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { can } from "@/lib/auth/permissions";
import { TeamView } from "./team-view";
import { InviteDialog } from "./invite-dialog";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const ctx = await requireOrg();
  const orgId = ctx.organization.id;

  const [members, invites] = await Promise.all([
    db.membership.findMany({
      where: { organizationId: orgId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true, emailVerified: true } },
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
    db.invitation.findMany({
      where: { organizationId: orgId, acceptedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        invitedBy: { select: { name: true, email: true } },
      },
    }),
  ]);

  const canInvite = can(ctx.membership.role, "members:invite");

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="Team"
          description="Wie heeft toegang tot deze werkruimte? Eigenaren beheren rechten en uitnodigingen."
          action={
            canInvite ? (
              <InviteDialog
                trigger={
                  <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
                    <UserPlus className="size-4" /> Lid uitnodigen
                  </button>
                }
              />
            ) : undefined
          }
        />

        <div className="mt-6">
          <TeamView
            currentUserId={ctx.user.id}
            currentRole={ctx.membership.role}
            members={members.map((m) => ({
              membershipId: m.id,
              userId: m.user.id,
              name: m.user.name,
              email: m.user.email,
              image: m.user.image,
              role: m.role,
              emailVerified: !!m.user.emailVerified,
              joinedAt: m.createdAt.toISOString(),
            }))}
            invites={invites.map((inv) => ({
              id: inv.id,
              email: inv.email,
              role: inv.role,
              expiresAt: inv.expires.toISOString(),
              invitedBy: inv.invitedBy.name ?? inv.invitedBy.email,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
