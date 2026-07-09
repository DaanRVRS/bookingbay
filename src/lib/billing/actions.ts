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
  chargePlanUpgradeProrata,
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
 * Self-service plan-wissel. Spelregels (tegen misbruik van "even upgraden,
 * dan terug" — anders krijg je het dure plan tegen de goedkope prijs):
 *
 *  - Geen actief abonnement (trial/verlopen/legacy): wissel direct, gratis.
 *  - Actief abonnement + UPGRADE: direct, met pro-rata verrekening van het
 *    prijsverschil voor de rest van de lopende periode (via de mandate);
 *    de volgende verlenging pakt het nieuwe volle bedrag.
 *  - Actief abonnement + DOWNGRADE: gaat in bij de volgende verlenging
 *    (pendingPlan) — je hebt immers al betaald voor de huidige periode.
 *    Het Mollie-bedrag wordt alvast omlaag gezet voor de volgende charge.
 *  - Je huidige plan kiezen terwijl er een downgrade gepland staat =
 *    de geplande wissel annuleren.
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
    select: {
      id: true,
      plan: true,
      pendingPlan: true,
      customDomain: true,
      subscriptionId: true,
      subscriptionStatus: true,
    },
  });
  if (!org) return { ok: false, error: "Organisatie niet gevonden" };

  const hasActiveSub =
    Boolean(org.subscriptionId) && org.subscriptionStatus === "active";

  // Huidig plan aangeklikt: alleen zinvol om een geplande downgrade te
  // annuleren.
  if (org.plan === newPlan) {
    if (!org.pendingPlan) {
      return { ok: false, error: "Dit is al je huidige plan." };
    }
    await db.organization.update({
      where: { id: org.id },
      data: { pendingPlan: null },
    });
    await syncSubscriptionAmount(org.id); // terug naar het huidige-plan-bedrag
    await audit({
      organizationId: org.id,
      actorUserId: ctx.user.id,
      action: "billing.plan.downgrade-canceled",
      resource: "organization",
      resourceId: org.id,
      metadata: { canceled: org.pendingPlan },
    });
    revalidatePath("/dashboard/settings/billing");
    return { ok: true };
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
  const isUpgrade =
    planLimits(newPlan).monthlyPriceEuro > planLimits(oldPlan).monthlyPriceEuro;

  if (hasActiveSub && !isUpgrade) {
    // Downgrade bij actief abonnement: inplannen voor de volgende
    // verlenging. Mollie-bedrag alvast omlaag zodat de volgende charge
    // het nieuwe bedrag pakt; de webhook zet dan ook org.plan om.
    await db.organization.update({
      where: { id: org.id },
      data: { pendingPlan: newPlan },
    });
    await syncSubscriptionAmount(org.id, newPlan);
    await audit({
      organizationId: org.id,
      actorUserId: ctx.user.id,
      action: "billing.plan.downgrade-scheduled",
      resource: "organization",
      resourceId: org.id,
      metadata: { from: oldPlan, to: newPlan },
    });
    revalidatePath("/dashboard/settings/billing");
    return { ok: true };
  }

  // Upgrade (of wissel zonder actief abonnement): direct.
  if (hasActiveSub && isUpgrade) {
    // Pro-rata verrekening voor de rest van de periode. Faalt Mollie,
    // dan gaat de wissel NIET door — anders is het gat weer open.
    try {
      await chargePlanUpgradeProrata({
        organizationId: org.id,
        oldPlan,
        newPlan,
      });
    } catch (err) {
      return {
        ok: false,
        error: `Verrekening van de upgrade kon niet gestart worden: ${
          err instanceof Error ? err.message.slice(0, 150) : "Mollie-fout"
        }`,
      };
    }
  }

  await db.organization.update({
    where: { id: org.id },
    data: { plan: newPlan, pendingPlan: null },
  });
  await syncSubscriptionAmount(org.id);

  await audit({
    organizationId: org.id,
    actorUserId: ctx.user.id,
    action: "billing.plan.changed",
    resource: "organization",
    resourceId: org.id,
    metadata: { from: oldPlan, to: newPlan, prorata: hasActiveSub && isUpgrade },
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
