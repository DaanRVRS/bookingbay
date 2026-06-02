"use server";

import { promises as dns } from "node:dns";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth/session";
import { audit } from "@/lib/audit/log";
import { env } from "@/lib/env";
import { planLimits } from "@/lib/plans";
import type { Plan } from "@prisma/client";
import type { ActionResult } from "@/lib/auth/schemas";
import { blockDemoWrite } from "@/lib/demo/guard";

// RFC-ish — sub.domain.tld minimum. Geen wildcards, geen IP-literals,
// geen schema-prefix. Lowercase forceren we in de action.
const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

const setDomainSchema = z.object({
  domain: z
    .string()
    .min(4)
    .max(253)
    .transform((s) => s.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, ""))
    .refine((s) => DOMAIN_REGEX.test(s), "Ongeldig domein"),
});

export async function setCustomDomainAction(
  input: { domain: string },
): Promise<ActionResult<{ cnameTarget: string }>> {
  const ctx = await requireOrg();
  const demoBlocked = blockDemoWrite(ctx);
  if (demoBlocked) return demoBlocked;
  const limits = planLimits(ctx.organization.plan as Plan);
  if (!limits.customDomain) {
    return {
      ok: false,
      error: "Custom-domein is alleen beschikbaar op Professional+ plannen",
    };
  }
  const parsed = setDomainSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ongeldig domein",
    };
  }
  const domain = parsed.data.domain;

  // Blokkeer onze eigen platform-hosts om confusing routes te voorkomen.
  const reservedSuffixes = [
    env.ROOT_DOMAIN.split(":")[0],
    env.TENANT_DOMAIN.split(":")[0],
    env.CUSTOM_DOMAIN_CNAME_TARGET,
  ].filter(Boolean);
  if (reservedSuffixes.some((s) => domain === s || domain.endsWith("." + s))) {
    return {
      ok: false,
      error: "Dit domein is van het platform zelf — gebruik je eigen domein",
    };
  }

  const collision = await db.organization.findFirst({
    where: { customDomain: domain, id: { not: ctx.organization.id } },
    select: { id: true },
  });
  if (collision) {
    return { ok: false, error: "Dit domein is al door een andere organisatie gekoppeld" };
  }

  await db.organization.update({
    where: { id: ctx.organization.id },
    data: { customDomain: domain, customDomainVerifiedAt: null },
  });
  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "org.customdomain.set",
    resource: "organization",
    resourceId: ctx.organization.id,
    metadata: { domain },
  });

  revalidatePath("/dashboard/site");
  return { ok: true, data: { cnameTarget: env.CUSTOM_DOMAIN_CNAME_TARGET } };
}

export async function verifyCustomDomainAction(): Promise<
  ActionResult<{ verified: boolean; observed?: string[]; expected: string }>
> {
  const ctx = await requireOrg();
  const demoBlocked = blockDemoWrite(ctx);
  if (demoBlocked) return demoBlocked;
  const org = await db.organization.findUnique({
    where: { id: ctx.organization.id },
    select: { customDomain: true, customDomainVerifiedAt: true },
  });
  if (!org?.customDomain) {
    return { ok: false, error: "Geen domein gekoppeld" };
  }

  const expected = env.CUSTOM_DOMAIN_CNAME_TARGET.toLowerCase();
  let observed: string[] = [];
  let matched = false;
  try {
    const records = await dns.resolveCname(org.customDomain);
    observed = records.map((r) => r.toLowerCase().replace(/\.$/, ""));
    matched = observed.some((r) => r === expected || r.endsWith("." + expected));
  } catch (err) {
    // Geen CNAME → probeer ANAME/A-record als fallback (b.v. apex-domeinen
    // die geen CNAME mogen — Cloudflare-flattening, ALIAS, e.d.).
    try {
      const ips = await dns.resolve4(org.customDomain);
      const expectedIps: string[] = await dns
        .resolve4(expected)
        .catch(() => [] as string[]);
      observed = ips;
      matched =
        expectedIps.length > 0 &&
        ips.some((ip) => expectedIps.includes(ip));
    } catch {
      // negeer — matched blijft false
    }
    if (!matched && observed.length === 0) {
      const message =
        err instanceof Error ? err.message : "DNS-resolutie mislukt";
      return {
        ok: false,
        error: `DNS-check faalde: ${message}`,
      };
    }
  }

  if (matched) {
    await db.organization.update({
      where: { id: ctx.organization.id },
      data: { customDomainVerifiedAt: new Date() },
    });
    await audit({
      organizationId: ctx.organization.id,
      actorUserId: ctx.user.id,
      action: "org.customdomain.verify",
      resource: "organization",
      resourceId: ctx.organization.id,
      metadata: { domain: org.customDomain, observed },
    });
    revalidatePath("/dashboard/site");
    return { ok: true, data: { verified: true, observed, expected } };
  }

  return {
    ok: true,
    data: { verified: false, observed, expected },
  };
}

export async function removeCustomDomainAction(): Promise<ActionResult> {
  const ctx = await requireOrg();
  const demoBlocked = blockDemoWrite(ctx);
  if (demoBlocked) return demoBlocked;
  const org = await db.organization.findUnique({
    where: { id: ctx.organization.id },
    select: { customDomain: true },
  });
  if (!org?.customDomain) return { ok: true };

  await db.organization.update({
    where: { id: ctx.organization.id },
    data: { customDomain: null, customDomainVerifiedAt: null },
  });
  await audit({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "org.customdomain.remove",
    resource: "organization",
    resourceId: ctx.organization.id,
    metadata: { domain: org.customDomain },
  });
  revalidatePath("/dashboard/site");
  return { ok: true };
}
