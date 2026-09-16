import { auth } from "@/lib/auth";
import { PlausibleScript } from "@/components/analytics/PlausibleScript";
import { SiteHeaderClient } from "./SiteHeaderClient";

export async function SiteHeader() {
  const session = await auth();
  const isLoggedIn = Boolean(session?.user?.id);
  return (
    <>
      {/* Statistieken alleen op de eigen marketingsite (zie PlausibleScript). */}
      <PlausibleScript />
      <SiteHeaderClient isLoggedIn={isLoggedIn} />
    </>
  );
}
