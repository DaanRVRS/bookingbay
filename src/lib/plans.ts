import type { Plan } from "@prisma/client";

export interface PlanLimits {
  /** Max active items in the catalog. Infinity = onbeperkt. */
  maxItems: number;
  /** Max members in the org (incl. OWNER). */
  maxMembers: number;
  /** Max custom-built pages on the tenant site (excludes the auto-generated home). */
  maxPages: number;
  customDomain: boolean;
  /** Show full site customizer (custom CSS, hide-poweredBy toggle, …) */
  customCss: boolean;
  /** Drag-and-drop page builder access */
  pageBuilder: boolean;
  hidePoweredByOption: boolean;
  /** Tenant page footer always shows the BookingBay credit when this is false */
  alwaysShowPoweredBy: boolean;
  /** Public REST API */
  apiAccess: boolean;
  prioritySupport: boolean;
  monthlyPriceEuro: number;
  label: string;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  STARTER: {
    maxItems: 25,
    maxMembers: 2,
    maxPages: 0,
    customDomain: false,
    customCss: false,
    pageBuilder: false,
    hidePoweredByOption: false,
    alwaysShowPoweredBy: true,
    apiAccess: false,
    prioritySupport: false,
    monthlyPriceEuro: 19,
    label: "Starter",
  },
  PROFESSIONAL: {
    maxItems: 150,
    maxMembers: 10,
    maxPages: 5,
    customDomain: true,
    customCss: false,
    pageBuilder: true,
    hidePoweredByOption: false,
    alwaysShowPoweredBy: true,
    apiAccess: false,
    prioritySupport: true,
    monthlyPriceEuro: 49,
    label: "Professional",
  },
  BUSINESS: {
    maxItems: Number.POSITIVE_INFINITY,
    maxMembers: Number.POSITIVE_INFINITY,
    maxPages: 12,
    customDomain: true,
    customCss: true,
    pageBuilder: true,
    hidePoweredByOption: true,
    alwaysShowPoweredBy: false,
    apiAccess: true,
    prioritySupport: true,
    monthlyPriceEuro: 99,
    label: "Business",
  },
  ENTERPRISE: {
    maxItems: Number.POSITIVE_INFINITY,
    maxMembers: Number.POSITIVE_INFINITY,
    maxPages: Number.POSITIVE_INFINITY,
    customDomain: true,
    customCss: true,
    pageBuilder: true,
    hidePoweredByOption: true,
    alwaysShowPoweredBy: false,
    apiAccess: true,
    prioritySupport: true,
    monthlyPriceEuro: 0,
    label: "Enterprise",
  },
};

export type PlanFeature = keyof Omit<
  PlanLimits,
  "maxItems" | "maxMembers" | "maxPages" | "monthlyPriceEuro" | "label"
>;

export function planLimits(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan];
}

/** Does the org's plan include this boolean feature? */
export function planAllows(plan: Plan, feature: PlanFeature): boolean {
  return PLAN_LIMITS[plan][feature];
}

export function describeLimit(plan: Plan, kind: "items" | "members" | "pages"): string {
  const v =
    kind === "items"
      ? PLAN_LIMITS[plan].maxItems
      : kind === "members"
        ? PLAN_LIMITS[plan].maxMembers
        : PLAN_LIMITS[plan].maxPages;
  if (!Number.isFinite(v)) return "Onbeperkt";
  return String(v);
}

/**
 * Throws when the action would exceed the plan limit. Message is
 * Dutch and aimed at end users.
 */
export function assertItemQuotaOk(plan: Plan, currentItemCount: number) {
  const max = PLAN_LIMITS[plan].maxItems;
  if (currentItemCount >= max) {
    throw new Error(
      `Je ${PLAN_LIMITS[plan].label}-plan bevat ${
        Number.isFinite(max) ? max : "onbeperkt"
      } items. Upgrade om er meer toe te voegen.`,
    );
  }
}

export function assertMemberQuotaOk(plan: Plan, currentMemberCount: number) {
  const max = PLAN_LIMITS[plan].maxMembers;
  if (currentMemberCount >= max) {
    throw new Error(
      `Je ${PLAN_LIMITS[plan].label}-plan staat ${
        Number.isFinite(max) ? max : "onbeperkt"
      } leden toe. Upgrade om meer te kunnen uitnodigen.`,
    );
  }
}

export function assertPageQuotaOk(plan: Plan, currentPageCount: number) {
  const max = PLAN_LIMITS[plan].maxPages;
  if (currentPageCount >= max) {
    throw new Error(
      `Je ${PLAN_LIMITS[plan].label}-plan bevat ${
        Number.isFinite(max) ? max : "onbeperkt"
      } pagina's. Upgrade om er meer toe te voegen.`,
    );
  }
}
