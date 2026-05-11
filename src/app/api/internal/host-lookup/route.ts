import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Looks up which tenant slug a custom-domain belongs to. Called from the
 * middleware (proxy.ts) for hosts that don't match the standard
 * <slug>.<TENANT_DOMAIN> pattern. Returns `{ slug: null }` for unknown
 * hosts.
 *
 * Only returns a slug when the customDomain is *verified* — unverified
 * domains shouldn't route, even if the DNS happens to point our way.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const host = url.searchParams.get("host")?.toLowerCase().trim();
  if (!host) {
    return NextResponse.json({ slug: null });
  }
  const org = await db.organization.findUnique({
    where: { customDomain: host },
    select: { slug: true, customDomainVerifiedAt: true },
  });
  if (!org || !org.customDomainVerifiedAt) {
    return NextResponse.json({ slug: null });
  }
  return NextResponse.json({ slug: org.slug });
}
