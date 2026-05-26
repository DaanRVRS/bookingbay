import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";
import { getImpersonation } from "@/lib/admin/impersonate";

export const ACTIVE_ORG_COOKIE = "bb_active_org";

export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const impersonation = await getImpersonation();
  const effectiveUserId = impersonation?.targetUserId ?? session.user.id;

  const user = await db.user.findUnique({
    where: { id: effectiveUserId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      emailVerified: true,
      isAdmin: true,
      isDemo: true,
    },
  });
  return user;
});

/**
 * The real, authenticated admin user — bypasses any active impersonation.
 * Use for permission checks that must not be spoofable through a stolen cookie.
 */
export const getRealUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      emailVerified: true,
      isAdmin: true,
      twoFactorEnabledAt: true,
    },
  });
});

export async function requireAdmin() {
  // Always check the REAL session — never the impersonated one — so a
  // running impersonation can't open the admin area as the target user.
  const user = await getRealUser();
  if (!user) redirect("/login?next=/admin");
  if (!user.isAdmin) {
    const { notFound } = await import("next/navigation");
    notFound();
  }
  // 2FA is mandatory for admins. Block access until enrolled — also voor
  // sessies die nog vóór de 2FA-feature zijn aangemaakt.
  if (!user.twoFactorEnabledAt) {
    redirect("/login/2fa/setup?next=/admin");
  }
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    // The auth() session may still resolve from the JWT cookie even if
    // the DB row was deleted (e.g. after a TRUNCATE). Naively redirecting
    // to /login lets the proxy bounce back to /dashboard because the JWT
    // still says "logged in" → infinite loop. Hop through /api/sign-out
    // first so the route handler can actually clear the cookies.
    const session = await auth();
    if (session?.user) {
      redirect("/api/sign-out?next=/login");
    }
    redirect("/login");
  }
  return user;
}

export type ActiveOrgContext = {
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  membership: { id: string; role: Role; organizationId: string };
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    primaryColor: string | null;
    logoUrl: string | null;
  };
  allMemberships: Array<{
    id: string;
    role: Role;
    organization: { id: string; name: string; slug: string };
  }>;
};

export const getActiveOrg = cache(async (): Promise<ActiveOrgContext | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const memberships = await db.membership.findMany({
    where: { userId: user.id },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          primaryColor: true,
          logoUrl: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) return null;

  const cookieStore = await cookies();
  const wanted = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  const matching = wanted
    ? memberships.find((m) => m.organizationId === wanted)
    : undefined;
  const active = matching ?? memberships[0];

  return {
    user,
    membership: {
      id: active.id,
      role: active.role,
      organizationId: active.organizationId,
    },
    organization: active.organization,
    allMemberships: memberships.map((m) => ({
      id: m.id,
      role: m.role,
      organization: {
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
      },
    })),
  };
});

export async function requireOrg(): Promise<ActiveOrgContext> {
  const ctx = await getActiveOrg();
  if (!ctx) {
    // Missing context can mean (a) no user in DB but session is still
    // alive — clear cookies first, or (b) user exists but has no
    // membership yet — send them to onboarding.
    const user = await getCurrentUser();
    if (!user) {
      const session = await auth();
      if (session?.user) {
        redirect("/api/sign-out?next=/login");
      }
      redirect("/login");
    }
    redirect("/onboarding");
  }
  if (!ctx.user.emailVerified) redirect("/check-email?context=verify");
  return ctx;
}
