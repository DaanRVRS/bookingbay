import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { createDemoTenant } from "@/lib/demo/seed";
import { signDemoToken } from "@/lib/demo/token";
import { DemoAutoSignin } from "./auto-signin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bekijk de demo — BookingBay",
  robots: { index: false, follow: false },
};

const COOKIE = "bb_demo_uid";
const COOKIE_TTL_DAYS = 30;

/**
 * Demo-entry. Server doet alle zwaarwerk:
 *  1. cookie check — heeft deze bezoeker al een eigen demo-tenant?
 *  2. zo nee → maak nieuwe (createDemoTenant met dummy-items + bookings)
 *  3. signt korte-TTL handoff-token, gooit 'm naar de client component
 *  4. client doet signIn("demo-handoff") + redirect naar /dashboard
 *
 * Hierdoor: 1 cookie = 1 demo-tenant. Wat de bezoeker in de demo aanpast
 * blijft alleen in *zijn* tenant. Andere demo-bezoekers krijgen een
 * eigen verse tenant.
 */
export default async function DemoEntryPage() {
  const cookieStore = await cookies();
  const existingId = cookieStore.get(COOKIE)?.value ?? null;

  let userId: string | null = null;
  let isFreshTenant = false;

  if (existingId) {
    // Hervat — alleen accepteren als de user nog bestaat én demo is.
    // Bij DB-cleanup is de oude user weg en moeten we 'n nieuwe maken.
    const existing = await db.user.findUnique({
      where: { id: existingId },
      select: { id: true, isDemo: true },
    });
    if (existing && existing.isDemo) {
      userId = existing.id;
    }
  }

  if (!userId) {
    const created = await createDemoTenant();
    userId = created.userId;
    isFreshTenant = true;
    cookieStore.set(COOKIE, userId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: COOKIE_TTL_DAYS * 24 * 60 * 60,
    });
  }

  const token = signDemoToken(userId);

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <div className="size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <h1 className="text-base font-semibold">
          {isFreshTenant ? "Demo wordt klaargezet…" : "Een momentje…"}
        </h1>
        <p className="text-xs text-muted-foreground">
          {isFreshTenant
            ? "We zetten een persoonlijke proefomgeving voor je klaar met voorbeeldboten, klanten en boekingen."
            : "We loggen je in op je eigen demo-omgeving."}
        </p>
        <DemoAutoSignin token={token} />
      </div>
    </main>
  );
}
