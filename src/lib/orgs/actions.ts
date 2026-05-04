"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, ACTIVE_ORG_COOKIE } from "@/lib/auth/session";
import { onboardingSchema, type OnboardingInput } from "./schemas";
import type { ActionResult } from "@/lib/auth/schemas";

function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!fields[path]) fields[path] = issue.message;
  }
  return fields;
}

export async function createOrganizationAction(
  input: OnboardingInput,
): Promise<ActionResult<{ organizationId: string; slug: string }>> {
  const user = await requireUser();
  if (!user.emailVerified) {
    return { ok: false, error: "Bevestig eerst je e-mail" };
  }

  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer", fieldErrors: fieldErrors(parsed.error) };
  }

  const { name, slug, industry, firstCategory } = parsed.data;

  // Check slug + custom-domain availability
  const existing = await db.organization.findUnique({ where: { slug } });
  if (existing) {
    return {
      ok: false,
      error: "Deze URL is al in gebruik",
      fieldErrors: { slug: "Al in gebruik — kies een andere" },
    };
  }

  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const org = await db.$transaction(async (tx) => {
    const created = await tx.organization.create({
      data: {
        name,
        slug,
        industry,
        plan: "STARTER",
        trialEndsAt,
        memberships: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
        categories: {
          create: {
            name: firstCategory,
            sortOrder: 0,
          },
        },
      },
      select: { id: true, slug: true },
    });
    return created;
  });

  // Activate this org for the user
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, org.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.NEXTAUTH_URL?.startsWith("https"),
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return { ok: true, data: { organizationId: org.id, slug: org.slug } };
}

export async function setActiveOrgAction(orgId: string): Promise<ActionResult> {
  const user = await requireUser();
  const membership = await db.membership.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: orgId } },
  });
  if (!membership) {
    return { ok: false, error: "Geen toegang tot deze organisatie" };
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.NEXTAUTH_URL?.startsWith("https"),
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return { ok: true };
}

export async function checkSlugAvailability(slug: string): Promise<{ available: boolean }> {
  if (slug.length < 3) return { available: false };
  const exists = await db.organization.findUnique({ where: { slug } });
  return { available: !exists };
}
