import "server-only";
import type { Invoice, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit/log";
import { COMPANY, companyAddressLine } from "@/lib/company";
import { splitVatCents } from "@/lib/plans";

/**
 * Facturen voor het BookingBay-abonnement — één per geslaagde Mollie-
 * betaling. Prijzen zijn inclusief 21% btw; netto en btw worden daaruit
 * afgeleid (splitVatCents). Geen btw-verlegging, geen VIES: het btw-nummer
 * van de klant wordt alleen vermeld als hij het heeft ingevuld.
 *
 * Nummering: BB-<jaar>-<volgnummer met 4 cijfers>, opeenvolgend per
 * kalenderjaar. Een Postgres advisory lock binnen de transactie serialiseert
 * gelijktijdige webhooks; de unieke index op (year, sequence) is het vangnet.
 */

const INVOICE_LOCK_KEY = 726100;

export interface InvoiceSellerSnapshot {
  name: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  kvk: string;
  vat: string;
  email: string;
}

export interface InvoiceCustomerSnapshot {
  companyName: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  vatNumber: string;
}

export function sellerSnapshot(): InvoiceSellerSnapshot {
  return {
    name: COMPANY.legalName,
    address: COMPANY.address,
    postalCode: COMPANY.postalCode,
    city: COMPANY.city,
    country: COMPANY.country,
    kvk: COMPANY.kvk,
    vat: COMPANY.vat,
    email: COMPANY.email,
  };
}

export function formatInvoiceNumber(year: number, sequence: number): string {
  return `BB-${year}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Maakt (idempotent per paymentId) een factuur aan. Retourneert de bestaande
 * factuur als de betaling al gefactureerd is — webhook-retries maken dus
 * nooit een tweede factuur of een gat in de nummering.
 */
export async function createInvoiceForPayment(args: {
  organizationId: string;
  paymentId: string;
  grossCents: number;
  description: string;
  periodStart: Date;
  periodEnd: Date;
  paymentMethod?: string | null;
  issuedAt?: Date;
}): Promise<Invoice> {
  const issuedAt = args.issuedAt ?? new Date();

  const invoice = await db.$transaction(async (tx) => {
    const existing = await tx.invoice.findUnique({ where: { paymentId: args.paymentId } });
    if (existing) return existing;

    // Serialiseer de nummer-uitgifte voor de duur van deze transactie.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${INVOICE_LOCK_KEY})`;

    const year = issuedAt.getUTCFullYear();
    const last = await tx.invoice.findFirst({
      where: { year },
      orderBy: { sequence: "desc" },
      select: { sequence: true },
    });
    const sequence = (last?.sequence ?? 0) + 1;

    const org = await tx.organization.findUnique({
      where: { id: args.organizationId },
      select: {
        name: true,
        billingCompanyName: true,
        billingAddress: true,
        billingPostcode: true,
        billingCity: true,
        billingCountry: true,
        billingEmail: true,
        billingVatNumber: true,
        businessAddress: true,
        businessPostcode: true,
        businessCity: true,
        vatNumber: true,
      },
    });
    if (!org) throw new Error("Organization missing");

    // Snapshot van de klantgegevens; fallback op de klantsite-gegevens voor
    // organisaties die vóór de verplichte facturatiegegevens al betaalden.
    const customer: InvoiceCustomerSnapshot = {
      companyName: org.billingCompanyName ?? org.name,
      address: org.billingAddress ?? org.businessAddress ?? "",
      postalCode: org.billingPostcode ?? org.businessPostcode ?? "",
      city: org.billingCity ?? org.businessCity ?? "",
      country: org.billingCountry ?? "NL",
      email: org.billingEmail ?? "",
      vatNumber: org.billingVatNumber ?? org.vatNumber ?? "",
    };

    const { netCents, vatCents } = splitVatCents(args.grossCents);

    return tx.invoice.create({
      data: {
        organizationId: args.organizationId,
        number: formatInvoiceNumber(year, sequence),
        year,
        sequence,
        issuedAt,
        periodStart: args.periodStart,
        periodEnd: args.periodEnd,
        description: args.description,
        netCents,
        vatCents,
        grossCents: args.grossCents,
        vatRate: 21,
        currency: "EUR",
        seller: sellerSnapshot() as unknown as Prisma.InputJsonValue,
        customer: customer as unknown as Prisma.InputJsonValue,
        paymentId: args.paymentId,
        paymentMethod: args.paymentMethod ?? null,
      },
    });
  });

  await audit({
    organizationId: args.organizationId,
    action: "billing.invoice.created",
    resource: "invoice",
    resourceId: invoice.id,
    metadata: { number: invoice.number, grossCents: invoice.grossCents, paymentId: args.paymentId },
  });

  return invoice;
}

/** "De Nieuwe Erven 3, 5431 NV Cuijk" voor de verkoperregel op de factuur. */
export function sellerAddressLine(): string {
  return companyAddressLine();
}
