import { auth } from "@/lib/auth";
import { SiteHeaderClient } from "./SiteHeaderClient";

export async function SiteHeader() {
  const session = await auth();
  const isLoggedIn = Boolean(session?.user?.id);
  return <SiteHeaderClient isLoggedIn={isLoggedIn} />;
}
