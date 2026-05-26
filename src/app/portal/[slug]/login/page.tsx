import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; sent?: string }>;
}

export const metadata = {
  title: "Inloggen — Mijn boekingen",
  robots: { index: false, follow: false },
};

export default async function PortalLoginPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { error, sent } = await searchParams;

  const org = await db.organization.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true,
      primaryColor: true,
      customerPortalEnabled: true,
      suspendedAt: true,
    },
  });
  if (!org) notFound();
  if (!org.customerPortalEnabled || org.suspendedAt) {
    // Portal staat uit — render een nette uitleg in plaats van een 404 zodat
    // klanten die de URL bookmarken niet voor een dichte deur staan.
    return (
      <PortalShell accent={org.primaryColor ?? "#ef5934"}>
        <h1 className="text-xl font-semibold tracking-tight">
          {org.name}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Het klant-portaal van deze verhuurder staat momenteel uit. Neem
          contact op met {org.name} om je boeking te beheren.
        </p>
      </PortalShell>
    );
  }

  return (
    <PortalShell accent={org.primaryColor ?? "#ef5934"}>
      <h1 className="text-xl font-semibold tracking-tight">
        Mijn boekingen bij {org.name}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Vul je e-mail in — we sturen je een link om in te loggen. Geen
        wachtwoord nodig.
      </p>
      <div className="mt-6">
        <LoginForm slug={org.slug} initialError={error} initialSent={sent === "1"} />
      </div>
    </PortalShell>
  );
}

function PortalShell({
  accent,
  children,
}: {
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-dvh">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${accent}25 0%, transparent 65%)`,
        }}
      />
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          {children}
        </div>
      </div>
    </main>
  );
}
