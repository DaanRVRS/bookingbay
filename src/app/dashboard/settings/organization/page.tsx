import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { OrgSettingsForm } from "./org-settings-form";
import { DangerZone } from "./danger-zone";
import { can } from "@/lib/auth/permissions";

export const metadata = { title: "Organisatie" };

export default async function OrgSettingsPage() {
  const ctx = await requireOrg();

  const org = await db.organization.findUnique({
    where: { id: ctx.organization.id },
    select: { id: true, name: true, slug: true, industry: true },
  });
  if (!org) throw new Error("Organization missing");

  const isOwner = can(ctx.membership.role, "org:manage");

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold">Algemeen</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Naam en slug worden gebruikt op je klantsite-URL en in transactionele e-mails.
        </p>
        <div className="mt-5">
          <OrgSettingsForm
            initial={{
              name: org.name,
              slug: org.slug,
              industry: org.industry ?? "",
            }}
            disabled={!isOwner}
          />
          {!isOwner && (
            <p className="mt-3 text-xs text-muted-foreground">
              Alleen Eigenaren mogen organisatie-instellingen wijzigen.
            </p>
          )}
        </div>
      </section>

      {isOwner && (
        <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <h2 className="text-base font-semibold text-destructive">Gevarenzone</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Definitief verwijderen van deze organisatie. Alle data — boekingen, klanten, items,
            leads — wordt onomkeerbaar gewist.
          </p>
          <div className="mt-4">
            <DangerZone orgName={org.name} />
          </div>
        </section>
      )}
    </div>
  );
}
