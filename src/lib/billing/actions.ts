"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/auth/session";
import { assertCan } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/auth/schemas";
import { isMollieConfigured } from "./mollie";
import {
  markScheduledCancel,
  resumeSubscription,
  startFirstPayment,
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

export async function cancelSubscriptionAction(): Promise<ActionResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "org:billing");

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
