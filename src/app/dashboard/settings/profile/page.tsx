import { CheckCircle2 } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";

export const metadata = { title: "Profiel" };

export default async function ProfileSettingsPage() {
  const user = await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold">Persoonlijke gegevens</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Je naam verschijnt op boekingen die je aanmaakt en in uitnodigingsmails.
        </p>
        <div className="mt-5">
          <ProfileForm initialName={user.name ?? ""} />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold">E-mailadres</h2>
        <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-4 py-3 text-sm">
          <div className="min-w-0">
            <p className="truncate font-medium">{user.email}</p>
            <p className="text-xs text-muted-foreground">
              {user.emailVerified ? (
                <span className="inline-flex items-center gap-1 text-[oklch(0.5_0.14_150)]">
                  <CheckCircle2 className="size-3" /> Geverifieerd
                </span>
              ) : (
                <span className="text-destructive">Nog niet geverifieerd</span>
              )}
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            Niet wijzigbaar
          </span>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold">Wachtwoord</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Wijzig je wachtwoord. Je blijft ingelogd op deze sessie.
        </p>
        <div className="mt-5">
          <PasswordForm />
        </div>
      </section>
    </div>
  );
}
