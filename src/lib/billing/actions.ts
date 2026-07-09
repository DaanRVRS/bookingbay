"use server";

import { revalidatePath } from "next/cache";
import type { Plan } from "@prisma/client";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth/session";
import { assertCan } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/auth/schemas";
import { blockDemoWrite } from "@/lib/demo/guard";
import { planLimits, PLAN_LIMITS } from "@/lib/plans";
import { audit } from "@/lib/audit/log";
import { isMollieConfigured } from "./mollie";
import {
  markScheduledCancel,
  resumeSubscription,
  startFirstPayment,
  syncSubscriptionAmount,
} from "./subscription";

/**
 * Server-actions die door de billing-page worden aangeroepen. Permissie-
 * check: alleen OWNER mag op de subscription stoppen/starten. ADMIN mag
 * facturatie inzien maar geen geld-acties triggeren.
 */

export async function startCheckoutAction(): Promise<
  ActionResult<{ checkoutUrl: string }>
> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "org:billing");
  const demoBlocked = blockDemoWrite(ctx);
  if (demoBlocked) return demoBlocked;

  if (!isMollieConfigured()) {
    return {
      ok: false,
      error:
        "Online betalen staat nog niet aan op deze server — mail hallo@bookingbay.nl en we activeren je handmatig.",
    };
  }

  try {
    const { checkoutUrl } = await startFirstPayment({
      organizationId: ctx.organization.id,
    });
    return { ok: true, data: { checkoutUrl } };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message.slice(0, 200)
          : "Checkout kon niet worden gestart",
    };
  }
}

/**
 * Self-service plan-wissel. Up- én downgraden kan direct; bij een actief
 * Mollie-abonnement wordt het maandbedrag van de subscription meteen
 * bijgewerkt zodat de VOLGENDE verlenging het nieuwe bedrag pakt (geen
 * pro-rata halverwege de maand — simpel en voorspelbaar).
 *
 * Downgrade-guards: het nieuwe plan moet het huidige gebruik aankunnen
 * (items/leden/pagina's/eigen domein), anders leggen we uit wat er eerst
 * weg moet i.p.v. de org stilletjes boven z'n limieten te zetten.
 */
export async function changePlanAction(newPlan: Plan): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "org:billing");
  const demoBlocked = blockDemoWrite(ctx);
  if (demoBlocked) return demoBlocked;

  if (!(newPlan in PLAN_LIMITS)) {
    return { ok: false, error: "Onbekend plan" };
  }
  if (PLAN_LIMITS[newPlan].customPricing) {
    return {
      ok: false,
      error:
        "Enterprise heeft maatwerk-pricing — mail hallo@bookingbay.nl en we regelen 't dezelfde dag.",
    };
  }

  const org = await db.organization.findUnique({
    where: { id: ctx.organization.id },
    select: { id: true, plan: true, customDomain: true },
  });
  if (!org) return { ok: false, error: "Organisatie niet gevonden" };
  if (org.plan === newPlan) {
    return { ok: false, error: "Dit is al je huidige plan." };
  }

  // Downgrade-guards tegen het huidige gebruik.
  const target = planLimits(newPlan);
  const [itemCount, memberCount, pageCount] = await Promise.all([
    db.item.count({ where: { organizationId: org.id, isActive: true } }),
    db.membership.count({ where: { organizationId: org.id } }),
    db.page.count({ where: { organizationId: org.id } }),
  ]);
  const blockers: string[] = [];
  if (itemCount > target.maxItems) {
    blockers.push(
      `je hebt ${itemCount} actieve items (max ${target.maxItems} op ${target.label})`,
    );
  }
  if (memberCount > target.maxMembers) {
    blockers.push(
      `je hebt ${memberCount} leden (max ${target.maxMembers} op ${target.label})`,
    );
  }
  if (pageCount > target.maxPages) {
    blockers.push(
      `je hebt ${pageCount} site-pagina's (max ${Number.isFinite(target.maxPages) ? target.maxPages : "onbeperkt"} op ${target.label})`,
    );
  }
  if (org.customDomain && !target.customDomain) {
    blockers.push(
      `je eigen domein (${org.customDomain}) is niet beschikbaar op ${target.label} — koppel dat eerst los`,
    );
  }
  if (blockers.length > 0) {
    return {
      ok: false,
      error: `Wisselen naar ${target.label} kan nog niet: ${blockers.join("; ")}.`,
    };
  }

  const oldPlan = org.plan;
  await db.organization.update({
    where: { id: org.id },
    data: { plan: newPlan },
  });

  // Actieve Mollie-subscription meteen op het nieuwe maandbedrag zetten —
  // best-effort (logt intern bij falen), volgende charge pakt het nieuwe
  // bedrag. Zelfde mechanisme als bij koppeling-wijzigingen.
  await syncSubscriptionAmount(org.id);

  await audit({
    organizationId: org.id,
    actorUserId: ctx.user.id,
    action: "billing.plan.changed",
    resource: "organization",
    resourceId: org.id,
    metadata: { from: oldPlan, to: newPlan },
  });

  revalidatePath("/dashboard/settings/billing");
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function cancelSubscriptionAction(): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "org:billing");
  const demoBlocked = blockDemoWrite(ctx);
  if (demoBlocked) return demoBlocked;

  try {
    await markScheduledCancel(ctx.organization.id);
    revalidatePath("/dashboard/settings/billing");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message.slice(0, 200)
          : "Cancel mislukt — probeer opnieuw of mail support",
    };
  }
}

export async function resumeSubscriptionAction(): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "org:billing");
  const demoBlocked = blockDemoWrite(ctx);
  if (demoBlocked) return demoBlocked;

  try {
    await resumeSubscription(ctx.organization.id);
    revalidatePath("/dashboard/settings/billing");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message.slice(0, 200)
          : "Hervatten mislukt — start anders een nieuwe checkout",
    };
  }
}
