import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

export const ACTIVE_ORG_COOKIE = "bb_active_org";

export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      emailVerified: true,
    },
  });
  return user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
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
  if (!ctx) redirect("/onboarding");
  if (!ctx.user.emailVerified) redirect("/check-email?context=verify");
  return ctx;
}
