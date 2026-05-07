import "server-only";
import { headers } from "next/headers";
import { env } from "@/lib/env";

/**
 * Returns the URL prefix for tenant-internal links, depending on how the
 * tenant site is being accessed.
 *
 * - **Subdomain mode** (e.g. `reuvers.bookingbay.<ip>.nip.io/...`): the
 *   proxy middleware rewrites internally to `/site/<slug>/...`, but the
 *   browser-visible URL stays subdomain-relative. Returns `""`.
 * - **Path-style fallback** (e.g. directly hitting
 *   `bookingbay.<ip>.nip.io/site/<slug>/...`): no rewrite, links must be
 *   prefixed with `/site/<slug>` to stay on the tenant. Returns
 *   `/site/<slug>`.
 *
 * Use [`tenantHref`] to compose URLs.
 */
export async function getTenantBasePath(slug: string): Promise<string> {
  const h = await headers();
  const host = (h.get("host") ?? "").toLowerCase();
  const adminHost = env.ROOT_DOMAIN.toLowerCase();
  if (host === adminHost) return `/site/${slug}`;
  return "";
}

/**
 * Compose a tenant-internal link from the base path + a subdomain-style
 * absolute path (e.g. `/`, `/contact`, `/item/abc`).
 */
export function tenantHref(base: string, path: string): string {
  if (path === "/") return base || "/";
  if (!path.startsWith("/")) path = `/${path}`;
  return `${base}${path}`;
}
