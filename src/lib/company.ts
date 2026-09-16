/**
 * Eén bron van waarheid voor de bedrijfsidentiteit achter BookingBay.
 * Wordt gebruikt in de footer, op /contact, in de voorwaarden, de
 * privacyverklaring, de verwerkersovereenkomst, security.txt, facturen en
 * de mailfooter. Wijzig hier en het staat overal goed.
 *
 * Client- én server-safe: geen imports, alleen constanten.
 */
export const COMPANY = {
  /** Productnaam / handelsnaam. */
  brand: "BookingBay",
  /** Rechtspersoon die de dienst levert en verwerkingsverantwoordelijke is. */
  legalName: "Fourwrd V.O.F.",
  address: "De Nieuwe Erven 3",
  postalCode: "5431 NV",
  city: "Cuijk",
  country: "Nederland",
  kvk: "42087615",
  vat: "NL869652308B01",
  /** Algemeen contact-, support-, privacy- en meldadres (bestaande mailbox). */
  email: "contact@fourwrd.nl",
  phone: "+31 85 369 7519",
  website: "https://www.bookingbay.nl",
  /** Bevoegde rechter bij geschillen (voorwaarden §11). */
  court: "de rechtbank Oost-Brabant",
  /** Datum van de huidige versie van voorwaarden, privacyverklaring en DPA. */
  legalUpdated: "16 september 2026",
} as const;

/** "De Nieuwe Erven 3, 5431 NV Cuijk" */
export function companyAddressLine(): string {
  return `${COMPANY.address}, ${COMPANY.postalCode} ${COMPANY.city}`;
}

/** Eén regel met alle wettelijk verplichte ondernemingsgegevens. */
export function companyLegalLine(): string {
  return `${COMPANY.brand} is een dienst van ${COMPANY.legalName}, ${companyAddressLine()} · KvK ${COMPANY.kvk} · btw ${COMPANY.vat}`;
}

/** Telefoonnummer zonder spaties, voor tel:-links. */
export function companyPhoneHref(): string {
  return `tel:${COMPANY.phone.replace(/\s/g, "")}`;
}

/**
 * Bewaartermijnen zoals de retentie-cron (src/lib/retention/run.ts) ze
 * daadwerkelijk toepast. De privacyverklaring leest deze waarden, zodat
 * tekst en code niet uit elkaar kunnen lopen.
 */
export const RETENTION = {
  /** Audit-log wordt na dit aantal maanden gewist. */
  auditLogMonths: 24,
  /** Afgehandelde leads (contactformulier) worden na dit aantal maanden gewist. */
  handledLeadMonths: 12,
  /** Klanten en hun boekingen worden dit aantal jaar na de laatste boeking geanonimiseerd. */
  customerYears: 7,
  /** Prospects in de eigen sales-CRM zonder contact of wijziging worden na dit aantal maanden gewist. */
  prospectMonths: 12,
  /** Betaal- en factuurgegevens (fiscale bewaarplicht). */
  financeYears: 7,
  /** Na het einde van een abonnement blijft de omgeving minimaal zoveel dagen beschikbaar om te hervatten of te exporteren. */
  orgGraceDays: 30,
} as const;
