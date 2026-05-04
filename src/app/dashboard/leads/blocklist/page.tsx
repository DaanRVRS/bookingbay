import { Shield } from "lucide-react";
import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { BlocklistView } from "./blocklist-view";
import { AddBlockDialog } from "./add-block-dialog";

export const metadata = { title: "Blocklist" };

export default async function BlocklistPage() {
  const ctx = await requireOrg();

  const blocks = await db.leadBlock.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title="Blocklist"
          description="Adressen of domeinen die geen leads meer mogen indienen via je klantsite."
          back={{ href: "/dashboard/leads", label: "Terug naar leads" }}
          action={
            <AddBlockDialog
              trigger={
                <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
                  <Shield className="size-4" />
                  Adres toevoegen
                </button>
              }
            />
          }
        />

        <p className="mt-4 rounded-md bg-muted/40 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          Voeg <code className="rounded bg-background px-1">spammer@voorbeeld.nl</code> toe om één
          specifiek adres te blokkeren, of <code className="rounded bg-background px-1">@voorbeeld.nl</code>{" "}
          (begin met @) om alle adressen van dat domein te weren. Geblokkeerde aanvragen worden
          stilletjes weggegooid — de afzender ziet dezelfde "bedankt"-bevestiging.
        </p>

        <div className="mt-6">
          <BlocklistView blocks={blocks.map((b) => ({
            id: b.id,
            pattern: b.pattern,
            reason: b.reason,
            createdAt: b.createdAt.toISOString(),
          }))} />
        </div>
      </div>
    </div>
  );
}
