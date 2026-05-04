import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/lib/auth/config";

const { auth } = NextAuth(authConfig);

// Hosts read from env at build/runtime; no DB needed in edge runtime.
const ADMIN_HOST = (process.env.NEXTAUTH_URL ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "");
const TENANT_DOMAIN = (process.env.TENANT_DOMAIN ?? ADMIN_HOST).replace(/\/$/, "");

function getTenantSlug(host: string): string | null {
  if (!host) return null;
  const lower = host.toLowerCase();
  if (lower === ADMIN_HOST.toLowerCase()) return null;
  // Localhost and dev fallbacks — leave them alone unless we see a tenant
  // pattern.
  if (lower === "localhost" || lower.startsWith("localhost:")) return null;

  // Tenant matches when host ends with ".${TENANT_DOMAIN}" — slug is the
  // last label before that suffix.
  const suffix = `.${TENANT_DOMAIN.toLowerCase()}`;
  if (!lower.endsWith(suffix)) return null;
  const prefix = lower.slice(0, -suffix.length);
  // For nested admin (acme.bookingbay.<ip>.nip.io with admin at
  // bookingbay.<ip>.nip.io): the prefix is e.g. "acme.bookingbay" and we
  // want only the leading label.
  return prefix.split(".")[0] || null;
}

function isPassThroughPath(path: string): boolean {
  return (
    path.startsWith("/_next/") ||
    path.startsWith("/api/") ||
    path === "/favicon.ico" ||
    path === "/robots.txt"
  );
}

export default auth((req: NextRequest) => {
  const host = req.headers.get("host") ?? "";
  const path = req.nextUrl.pathname;

  // Backwards-compat: route old /uploads/<...> URLs to the runtime
  // file-streaming Route Handler. New uploads use /api/uploads/ directly.
  if (path.startsWith("/uploads/")) {
    const url = req.nextUrl.clone();
    url.pathname = `/api${path}`;
    return NextResponse.rewrite(url);
  }

  if (isPassThroughPath(path)) return NextResponse.next();
  if (path.startsWith("/site/")) return NextResponse.next();

  const slug = getTenantSlug(host);
  if (slug) {
    const url = req.nextUrl.clone();
    url.pathname = `/site/${slug}${path === "/" ? "" : path}`;
    return NextResponse.rewrite(url);
  }

  // Auth.js's authorized callback already handles dashboard/onboarding redirects
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
