import { DemoAutoSignin } from "./auto-signin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Demo wordt geopend — BookingBay",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

/**
 * Tussen-page tussen /demo (Route Handler die de tenant maakt) en het
 * dashboard. Token komt binnen als querystring; de client-component
 * wisselt 'm bij NextAuth uit voor een echte sessie en redirect naar
 * /dashboard.
 *
 * Aparte page i.p.v. inline in /demo Route Handler omdat client-side
 * signIn() een React-context vereist (NextAuth's session provider).
 */
export default async function DemoAuthPage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <div className="size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <h1 className="text-base font-semibold">Demo openen…</h1>
        <p className="text-xs text-muted-foreground">
          Je wordt direct naar je persoonlijke demo-omgeving gestuurd.
        </p>
        {token ? (
          <DemoAutoSignin token={token} />
        ) : (
          <p className="mt-4 text-xs text-destructive">
            Geen geldige demo-token. <a href="/demo" className="underline">Probeer opnieuw</a>.
          </p>
        )}
      </div>
    </main>
  );
}
