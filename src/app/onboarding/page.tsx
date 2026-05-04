import { redirect } from "next/navigation";
import { Logo } from "@/components/marketing/Logo";
import { OnboardingForm } from "./onboarding-form";
import { getActiveOrg, requireUser } from "@/lib/auth/session";

export const metadata = { title: "Welkom bij BookingBay" };

export default async function OnboardingPage() {
  const user = await requireUser();
  if (!user.emailVerified) redirect("/check-email?context=verify");

  const ctx = await getActiveOrg();
  if (ctx) redirect("/dashboard");

  return (
    <div className="relative flex min-h-svh flex-col">
      <div
        aria-hidden
        className="bg-grid bg-radial-fade pointer-events-none absolute inset-0 -z-10 opacity-40"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-br from-primary/20 via-primary/5 to-transparent blur-3xl"
      />

      <header className="px-6 py-5">
        <Logo />
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-20 sm:items-center">
        <div className="w-full max-w-xl">
          <div className="rounded-2xl border border-border bg-card p-7 shadow-[0_24px_60px_-30px_color-mix(in_oklch,var(--foreground)_15%,transparent)] sm:p-9">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              <span className="size-1.5 rounded-full bg-primary" />
              Stap 1 van 1
            </span>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">
              Hi {user.name?.split(" ")[0] ?? "daar"} — laten we je werkruimte opzetten
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Geef je organisatie een naam, kies een URL voor je toekomstige klantsite, en kies je
              eerste categorie. Je kan alles later aanpassen.
            </p>
            <div className="mt-7">
              <OnboardingForm defaultName={user.name?.split(" ").slice(-1)[0] ?? ""} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
