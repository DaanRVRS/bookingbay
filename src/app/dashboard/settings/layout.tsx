import { requireOrg } from "@/lib/auth/session";
import { SettingsNav } from "./settings-nav";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireOrg();

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-4xl">
        <div className="border-b border-border pb-5">
          <h1 className="text-2xl font-semibold tracking-tight">Instellingen</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Beheer je profiel, je organisatie en je abonnement.
          </p>
        </div>

        <SettingsNav />

        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
