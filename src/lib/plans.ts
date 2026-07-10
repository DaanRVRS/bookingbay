import type { Plan } from "@prisma/client";

export interface PlanLimits {
  /** Max active items in the catalog. Infinity = onbeperkt. */
  maxItems: number;
  /** Max members in the org (incl. OWNER). */
  maxMembers: number;
  /**
   * Max ÉXTRA pagina's op de klantsite, náást de homepagina. De homepagina
   * bestaat altijd, is niet verwijderbaar en telt nergens mee — 0 betekent
   * dus: alleen de homepagina (Starter).
   */
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
  /** Eigen account-manager + SLA — alleen Enterprise. */
  dedicatedSupport: boolean;
  /** SSO/SAML login — alleen Enterprise. */
  sso: boolean;
  /** Volledig branding-vrij ('powered by' overal weg, custom from-adres mail). */
  whiteLabel: boolean;
  monthlyPriceEuro: number;
  /** True voor tiers met "bel ons / op aanvraag" pricing — verbergt €0/maand. */
  customPricing: boolean;
  label: string;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  STARTER: {
    maxItems: 25,
    maxMembers: 2,
    // Alleen de homepagina — wél in de builder te bewerken, geen extra
    // pagina's erbij.
    maxPages: 0,
    customDomain: false,
    customCss: false,
    pageBuilder: true,
    hidePoweredByOption: false,
    alwaysShowPoweredBy: true,
    apiAccess: false,
    prioritySupport: false,
    dedicatedSupport: false,
    sso: false,
    whiteLabel: false,
    monthlyPriceEuro: 24.99,
    customPricing: false,
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
    dedicatedSupport: false,
    sso: false,
    whiteLabel: false,
    monthlyPriceEuro: 59.99,
    customPricing: false,
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
    dedicatedSupport: false,
    sso: false,
    whiteLabel: false,
    monthlyPriceEuro: 109.99,
    customPricing: false,
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
    dedicatedSupport: true,
    sso: true,
    whiteLabel: true,
    monthlyPriceEuro: 0,
    customPricing: true,
    label: "Enterprise",
  },
};

export type PlanFeature = keyof Omit<
  PlanLimits,
  | "maxItems"
  | "maxMembers"
  | "maxPages"
  | "monthlyPriceEuro"
  | "customPricing"
  | "label"
>;

export function planLimits(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan];
}

/** Dutch-formatted euro, bv. 24.99 → "€ 24,99". Voor "Op aanvraag" zelf afhandelen. */
const EURO_NL = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export function formatEuroNL(n: number): string {
  return EURO_NL.format(n);
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

/**
 * `currentPageCount` = aantal ÉXTRA pagina's (home niet meetellen!).
 */
export function assertPageQuotaOk(plan: Plan, currentPageCount: number) {
  const max = PLAN_LIMITS[plan].maxPages;
  if (currentPageCount >= max) {
    throw new Error(
      max === 0
        ? `Je ${PLAN_LIMITS[plan].label}-plan bevat alleen de homepagina. Upgrade om extra pagina's toe te voegen.`
        : `Je ${PLAN_LIMITS[plan].label}-plan bevat naast de homepagina ${
            Number.isFinite(max) ? max : "onbeperkt"
          } extra pagina's. Upgrade om er meer toe te voegen.`,
    );
  }
}
