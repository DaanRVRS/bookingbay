import "server-only";
import { db } from "@/lib/db";

/**
 * Facturatiegegevens van de klant (verhuurder) voor de abonnementsfactuur.
 * Bedrijfsnaam, adres, postcode en plaats zijn verplicht vóór de checkout;
 * factuur-e-mail en btw-nummer zijn optioneel (geen btw-verlegging).
 */
export interface BillingDetails {
  companyName: string;
  address: string;
  postcode: string;
  city: string;
  country: string;
  email: string;
  vatNumber: string;
}

const REQUIRED: Array<{ key: keyof BillingDetails; label: string }> = [
  { key: "companyName", label: "bedrijfsnaam" },
  { key: "address", label: "adres" },
  { key: "postcode", label: "postcode" },
  { key: "city", label: "plaats" },
];

export function billingDetailsMissing(d: BillingDetails): string[] {
  return REQUIRED.filter(({ key }) => !d[key].trim()).map(({ label }) => label);
}

/** Opgeslagen facturatiegegevens (zonder fallbacks). */
export async function getBillingDetails(organizationId: string): Promise<BillingDetails> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      billingCompanyName: true,
      billingAddress: true,
      billingPostcode: true,
      billingCity: true,
      billingCountry: true,
      billingEmail: true,
      billingVatNumber: true,
    },
  });
  return {
    companyName: org?.billingCompanyName ?? "",
    address: org?.billingAddress ?? "",
    postcode: org?.billingPostcode ?? "",
    city: org?.billingCity ?? "",
    country: org?.billingCountry ?? "NL",
    email: org?.billingEmail ?? "",
    vatNumber: org?.billingVatNumber ?? "",
  };
}

/**
 * Voorstel om het formulier mee te vullen als er nog niets is opgeslagen:
 * de gegevens die de klant al voor de klantsite-footer heeft ingevuld en
 * het e-mailadres van de eigenaar. De klant bevestigt ze door op te slaan.
 */
export async function getBillingDetailsPrefill(organizationId: string): Promise<BillingDetails> {
  const stored = await getBillingDetails(organizationId);
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      name: true,
      businessAddress: true,
      businessPostcode: true,
      businessCity: true,
      vatNumber: true,
      memberships: {
        where: { role: "OWNER" },
        take: 1,
        select: { user: { select: { email: true } } },
      },
    },
  });
  return {
    companyName: stored.companyName || org?.name || "",
    address: stored.address || org?.businessAddress || "",
    postcode: stored.postcode || org?.businessPostcode || "",
    city: stored.city || org?.businessCity || "",
    country: stored.country || "NL",
    email: stored.email || org?.memberships[0]?.user.email || "",
    vatNumber: stored.vatNumber || org?.vatNumber || "",
  };
}

export async function missingBillingDetails(organizationId: string): Promise<string[]> {
  return billingDetailsMissing(await getBillingDetails(organizationId));
}
