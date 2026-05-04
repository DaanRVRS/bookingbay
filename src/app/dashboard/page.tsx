import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/lib/auth/actions";
import { auth } from "@/lib/auth";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!session.user.emailVerified) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Bevestig je e-mail</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We hebben een verificatie-link gestuurd naar{" "}
          <span className="font-medium text-foreground">{session.user.email}</span>. Klik 'm aan om
          door te gaan.
        </p>
        <form action={logoutAction} className="mt-6">
          <button
            type="submit"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Uitloggen
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hi {session.user.name?.split(" ")[0] ?? session.user.email}, welkom bij BookingBay.
          </p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            Uitloggen
          </button>
        </form>
      </div>

      <div className="mt-10 rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          Volgende stap — onboarding wizard om je organisatie aan te maken.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Onboarding + categorieën + items komen in de volgende build.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-lg border border-border bg-card px-5 text-sm font-medium hover:bg-accent"
        >
          Terug naar home
        </Link>
      </div>
    </div>
  );
}
