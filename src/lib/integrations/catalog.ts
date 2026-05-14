/**
 * Catalogus van alle koppelingen — single source-of-truth voor zowel het
 * publieke landing (/koppelingen) als het dashboard (/dashboard/integrations).
 * De *per-org* state (geactiveerd, paused, etc.) leeft in de DB op
 * Prisma's `OrgIntegration`-model; deze file beschrijft alleen de catalogus.
 *
 * Slugs hier == `integrationKey` in de DB. Niet herbenoemen zonder migratie.
 *
 * Beschikbaarheid:
 *   - "available"  → klant kan zelf-serveren (OAuth-flow of API-key veld).
 *   - "beta"       → live, maar via support / handmatig geactiveerd.
 *   - "coming-soon" → catalogus toont 'm, klant kan interesse tonen.
 */

export type IntegrationStatus = "available" | "beta" | "coming-soon";

export interface IntegrationCategory {
  slug: string;
  name: string;
  /** Korte intro op de listing-pagina van de categorie. */
  blurb: string;
}

export interface IntegrationDef {
  slug: string;
  name: string;
  categorySlug: string;
  status: IntegrationStatus;
  /** Maandprijs als upsell bovenop het maand-abbo. Altijd > 0 — elke
   *  koppeling kost iets, ook bij providers die zelf geen kosten rekenen
   *  (wij draaien de plumbing, sync en support). */
  monthlyPriceEuro: number;
  /** 1-zinsbeschrijving voor de catalogus-tegel. */
  tagline: string;
  /** Marketing-paragrafen voor de detail-pagina. */
  description: string[];
  /** "Wat krijg je"-bullets — punten op de detail-pagina. */
  features: string[];
  /** Optionele scopes/permissions die we vragen — netjes naar de klant communiceren. */
  scopes?: string[];
  /** Mini-FAQ per koppeling. */
  faq?: { q: string; a: string }[];
  /** URL naar de website van de provider (voor klant referentie). */
  vendorUrl?: string;
  /** Iconify-icoonnaam (uit de `logos`-collectie) — bv. "logos:slack".
   *  Wordt gerenderd door <IntegrationLogo />. Werkt offline omdat we
   *  Iconify in de bundle hebben. */
  iconifyId: string;
}

export const CATEGORIES: IntegrationCategory[] = [
  {
    slug: "agenda",
    name: "Agenda",
    blurb:
      "Sync je boekingen met de agenda's die je team al gebruikt — twee-richtingen, realtime.",
  },
  {
    slug: "betaalproviders",
    name: "Betaalproviders",
    blurb:
      "Laat klanten direct online betalen bij het boeken. iDEAL, kaart, factuur — kies wat past.",
  },
  {
    slug: "boekhouding",
    name: "Boekhouding",
    blurb:
      "Push facturen, betalingen en klanten automatisch door naar je boekhoudpakket.",
  },
  {
    slug: "communicatie",
    name: "Communicatie",
    blurb:
      "Krijg nieuwe boekingen, annuleringen en leads direct in je team-chat of WhatsApp.",
  },
  {
    slug: "email-marketing",
    name: "E-mail marketing",
    blurb:
      "Stuur klanten naar je nieuwsbrief-tool zodra ze geboekt hebben — zonder export-CSV's.",
  },
  {
    slug: "crm",
    name: "CRM",
    blurb:
      "Houd je sales-pipeline bij in de tool die je sales-team al kent.",
  },
  {
    slug: "office-tools",
    name: "Office tools",
    blurb:
      "Verbind cloud-storage, automatisering en de rest van je software-stack.",
  },
  {
    slug: "analytics",
    name: "Analytics",
    blurb:
      "Meet conversie en herkomst van boekingen — privacy-vriendelijk of klassiek.",
  },
];

export const INTEGRATIONS: IntegrationDef[] = [
  // ─── Agenda ──────────────────────────────────────────────────────────
  {
    slug: "google-calendar",
    name: "Google Calendar",
    categorySlug: "agenda",
    status: "available",
    monthlyPriceEuro: 9,
    tagline: "Twee-richtingen sync met de agenda van je team.",
    description: [
      "Elke boeking die binnenkomt verschijnt direct in de Google Calendar van het item — of in een gedeelde teamagenda als je dat liever hebt.",
      "Schrijft een collega iets in z'n agenda? Dan blokkeert dat automatisch beschikbaarheid in BookingBay. Zo voorkom je dubbel-boekingen tussen je eigen vrije momenten en publieke beschikbaarheid.",
    ],
    features: [
      "Twee-richtingen sync (BookingBay ↔ Google)",
      "Per item een eigen agenda óf één gedeelde agenda",
      "Real-time updates via webhooks (geen polling)",
      "Vrije blokken in Google → automatisch niet boekbaar",
      "Annulering in BookingBay = event verwijderd",
    ],
    scopes: ["Lezen + schrijven van je geselecteerde agenda(s)"],
    faq: [
      {
        q: "Welke agenda's kan ik koppelen?",
        a: "Je primaire agenda en alle agenda's waar je 'maken van wijzigingen' rechten op hebt. Personal en Google Workspace zijn beide ondersteund.",
      },
      {
        q: "Kan ik per item een andere agenda kiezen?",
        a: "Ja. Standaard gebruiken we één gedeelde agenda, maar je kunt per item een aparte agenda instellen (handig als 'Boot A' en 'Boot B' verschillende eigenaars hebben).",
      },
      {
        q: "Wat gebeurt er als ik de koppeling pauzeer?",
        a: "We stoppen met syncen. Bestaande events blijven staan in beide systemen. Bij opnieuw activeren synct alleen alles vanaf dat moment.",
      },
    ],
    vendorUrl: "https://calendar.google.com",
    iconifyId: "logos:google-calendar",
  },
  {
    slug: "outlook-calendar",
    name: "Outlook Calendar",
    categorySlug: "agenda",
    status: "coming-soon",
    monthlyPriceEuro: 9,
    tagline: "Sync met Microsoft 365 / Outlook.com agenda.",
    description: [
      "Voor teams die op Microsoft 365 draaien. Zelfde concept als Google Calendar — boekingen verschijnen in Outlook, geblokte tijd in Outlook = niet boekbaar in BookingBay.",
    ],
    features: [
      "Microsoft 365 en Outlook.com support",
      "Per item of gedeelde agenda",
      "Real-time push-notifications",
    ],
    vendorUrl: "https://outlook.live.com",
    iconifyId: "vscode-icons:file-type-outlook",
  },
  {
    slug: "apple-calendar",
    name: "Apple Calendar (iCloud)",
    categorySlug: "agenda",
    status: "coming-soon",
    monthlyPriceEuro: 9,
    tagline: "Sync via iCloud — werkt op iPhone, iPad en Mac.",
    description: [
      "Native koppeling met iCloud via CalDAV. Boekingen verschijnen direct op alle Apple-devices van je team.",
    ],
    features: [
      "CalDAV (officieel ondersteund door Apple)",
      "App-specifieke wachtwoorden voor veiligheid",
      "Werkt met gedeelde Family-agenda's",
    ],
    iconifyId: "logos:apple",
  },

  // ─── Betaalproviders ─────────────────────────────────────────────────
  {
    slug: "mollie",
    name: "Mollie",
    categorySlug: "betaalproviders",
    status: "available",
    monthlyPriceEuro: 9,
    tagline: "iDEAL, Bancontact, kaart en meer — direct bij het boeken.",
    description: [
      "Mollie is de meest gebruikte payment-provider in Nederland. Klanten zien direct iDEAL bij het afrekenen — geen account, geen omwegen.",
      "Wij maken automatisch een Mollie-payment aan bij elke boeking en updaten de status zodra de klant betaalt. Mislukte betalingen markeren de boeking als 'wacht op betaling' — zo verlies je nooit een booking aan een halve checkout.",
    ],
    features: [
      "iDEAL, Bancontact, kaart, Klarna, Apple Pay, etc.",
      "Automatische status-sync naar de boeking",
      "Optioneel: alleen aanbetaling vragen (% van totaal)",
      "Refund vanuit BookingBay (bij annulering)",
      "Webhook-verificatie ingebouwd",
    ],
    scopes: ["API-key met 'payments' rechten"],
    faq: [
      {
        q: "Wat zijn de transactiekosten?",
        a: "Die rekent Mollie zelf — ~€0,29 per iDEAL-betaling. BookingBay rekent €9/maand voor de koppeling zelf, geen marge bovenop transacties.",
      },
      {
        q: "Heb ik een Mollie-account nodig?",
        a: "Ja. Account maken duurt ~10 minuten op mollie.com. Wij koppelen daarna via API-key.",
      },
      {
        q: "Kan ik aanbetaling vragen ipv volledig?",
        a: "Ja, per item of organisatie-breed instelbaar. Bijvoorbeeld 30% bij boeken, rest bij ophalen.",
      },
    ],
    vendorUrl: "https://mollie.com",
    iconifyId: "logos:mollie",
  },
  {
    slug: "stripe",
    name: "Stripe",
    categorySlug: "betaalproviders",
    status: "coming-soon",
    monthlyPriceEuro: 9,
    tagline: "Internationale kaartbetalingen + abonnementen.",
    description: [
      "Voor wie ook buiten Nederland verhuurt. Stripe ondersteunt kaarten wereldwijd, Apple Pay, Google Pay en SEPA — handig als je klanten uit meerdere landen hebt.",
    ],
    features: [
      "Wereldwijde kaartbetalingen",
      "Apple Pay / Google Pay",
      "Multi-currency",
      "Refunds vanuit dashboard",
    ],
    vendorUrl: "https://stripe.com",
    iconifyId: "logos:stripe",
  },
  {
    slug: "buckaroo",
    name: "Buckaroo",
    categorySlug: "betaalproviders",
    status: "coming-soon",
    monthlyPriceEuro: 9,
    tagline: "Nederlandse PSP met iDEAL, Bancontact en SEPA.",
    description: [
      "Alternatief voor Mollie — sommige klanten zitten al bij Buckaroo via hun bank. Zelfde feature-set, andere fees.",
    ],
    features: [
      "iDEAL, Bancontact, kaart",
      "Periodiek incasso (SEPA)",
      "Nederlandse support",
    ],
    vendorUrl: "https://www.buckaroo.nl",
    iconifyId: "mdi:credit-card-outline",
  },
  {
    slug: "paypal",
    name: "PayPal",
    categorySlug: "betaalproviders",
    status: "coming-soon",
    monthlyPriceEuro: 9,
    tagline: "Wereldwijd herkenbaar — laagdrempelig voor toeristen.",
    description: [
      "Vooral handig bij verhuur aan internationale klanten. Veel toeristen pakken liever PayPal dan kaart-formulier in een vreemde taal.",
    ],
    features: [
      "PayPal-balance + kaart",
      "Wereldwijde herkenbaarheid",
      "Geschillenbeheer via PayPal",
    ],
    vendorUrl: "https://www.paypal.com",
    iconifyId: "logos:paypal",
  },

  // ─── Boekhouding ─────────────────────────────────────────────────────
  {
    slug: "moneybird",
    name: "Moneybird",
    categorySlug: "boekhouding",
    status: "available",
    monthlyPriceEuro: 12,
    tagline: "Facturen, klanten en betalingen automatisch in Moneybird.",
    description: [
      "Moneybird is dé boekhoudtool voor kleine verhuurbedrijven in Nederland. Wij maken automatisch een factuur aan in Moneybird zodra een boeking afgesloten is — inclusief BTW-uitsplitsing en de juiste grootboekrekening.",
      "Nieuwe klanten in BookingBay worden ook automatisch contactpersonen in Moneybird, zodat je in beide systemen dezelfde records hebt.",
    ],
    features: [
      "Boeking → factuur (PDF + ingeboekt)",
      "Klant-records synchroon",
      "BTW (21% / 9% / 0%) automatisch toegewezen",
      "Betalingen via Mollie → markeert factuur als betaald",
      "Aparte grootboekrekening per categorie (optioneel)",
    ],
    scopes: ["API-token met administratie-toegang"],
    faq: [
      {
        q: "Werkt dit met de gratis Moneybird-plan?",
        a: "Nee — Moneybird's API zit op het 'Premium'-plan. Je betaalt dus voor Moneybird Premium + €12/m voor onze koppeling.",
      },
      {
        q: "Kan ik historische boekingen ook syncen?",
        a: "Bij activatie syncen we de laatste 30 dagen. Alles daarvoor blijft alleen in BookingBay (je kunt het wel altijd handmatig exporteren).",
      },
    ],
    vendorUrl: "https://moneybird.nl",
    iconifyId: "mdi:bird",
  },
  {
    slug: "exact-online",
    name: "Exact Online",
    categorySlug: "boekhouding",
    status: "coming-soon",
    monthlyPriceEuro: 19,
    tagline: "Push facturen door naar Exact Online.",
    description: [
      "Voor MKB-bedrijven die op Exact draaien. Zelfde idee als Moneybird, andere doelgroep.",
    ],
    features: [
      "Boeking → factuur in Exact",
      "Klant-stamgegevens sync",
      "Grootboekrekening per item-categorie",
    ],
    vendorUrl: "https://www.exact.com/nl",
    iconifyId: "mdi:equal-box",
  },
  {
    slug: "afas",
    name: "AFAS Software",
    categorySlug: "boekhouding",
    status: "coming-soon",
    monthlyPriceEuro: 29,
    tagline: "Voor de grotere verhuurbedrijven met AFAS Profit.",
    description: [
      "Voor enterprise-klanten die op AFAS draaien. Sync van verkoopfacturen via GetConnector / UpdateConnector.",
    ],
    features: [
      "GetConnector / UpdateConnector",
      "Multi-vestigingen support",
      "Custom grootboek-mapping",
    ],
    vendorUrl: "https://www.afas.nl",
    iconifyId: "mdi:office-building-outline",
  },
  {
    slug: "e-boekhouden",
    name: "e-Boekhouden.nl",
    categorySlug: "boekhouding",
    status: "coming-soon",
    monthlyPriceEuro: 12,
    tagline: "Betaalbare keuze voor ZZP'ers en kleine bedrijven.",
    description: [
      "e-Boekhouden.nl is populair onder ZZP-verhuurders. Wij pushen verkoopfacturen en betalingen door, zodat je in één keer BTW-aangifte kunt doen.",
    ],
    features: [
      "Verkoopfacturen sync",
      "Klantgegevens sync",
      "BTW-correct",
    ],
    vendorUrl: "https://www.e-boekhouden.nl",
    iconifyId: "mdi:book-account-outline",
  },
  {
    slug: "twinfield",
    name: "Twinfield",
    categorySlug: "boekhouding",
    status: "coming-soon",
    monthlyPriceEuro: 19,
    tagline: "Wolters Kluwer's boekhoudsoftware voor accountants.",
    description: [
      "Voor bedrijven die hun boekhouding bij een Twinfield-accountantskantoor laten doen. Wij leveren facturen direct aan de juiste administratie.",
    ],
    features: [
      "Multi-administratie",
      "Accountantskantoor-vriendelijk",
    ],
    vendorUrl: "https://www.twinfield.com",
    iconifyId: "mdi:bank-outline",
  },

  // ─── Communicatie ────────────────────────────────────────────────────
  {
    slug: "slack",
    name: "Slack",
    categorySlug: "communicatie",
    status: "coming-soon",
    monthlyPriceEuro: 9,
    tagline: "Nieuwe boekingen direct in je team-channel.",
    description: [
      "Krijg in je gekozen Slack-channel een bericht bij elke nieuwe boeking, annulering of contact-aanvraag. Met snel-knoppen om de boeking te openen of de klant te bellen.",
    ],
    features: [
      "Per event-type een aparte channel kiezen",
      "Inline acties (open boeking, bel klant)",
      "Threading voor follow-up",
    ],
    vendorUrl: "https://slack.com",
    iconifyId: "logos:slack-icon",
  },
  {
    slug: "microsoft-teams",
    name: "Microsoft Teams",
    categorySlug: "communicatie",
    status: "coming-soon",
    monthlyPriceEuro: 9,
    tagline: "Boekingen in je Teams-channel — zelfde idee als Slack.",
    description: [
      "Voor Microsoft 365 teams. Adaptive Cards met klant-info en quick actions.",
    ],
    features: ["Adaptive Cards", "Per channel routing", "Quick actions"],
    vendorUrl: "https://www.microsoft.com/teams",
    iconifyId: "logos:microsoft-teams",
  },
  {
    slug: "whatsapp-business",
    name: "WhatsApp Business",
    categorySlug: "communicatie",
    status: "coming-soon",
    monthlyPriceEuro: 15,
    tagline: "Stuur bevestigingen en herinneringen via WhatsApp.",
    description: [
      "Klanten krijgen direct na boeken een WhatsApp-bevestiging. Een dag voor ophalen automatisch een reminder. Via de officiële WhatsApp Business API.",
    ],
    features: [
      "Boekingsbevestiging via WhatsApp",
      "24u-reminder voor ophalen",
      "Templates via WhatsApp Business",
      "Conversaties terugzien per klant",
    ],
    vendorUrl: "https://business.whatsapp.com",
    iconifyId: "logos:whatsapp-icon",
  },
  {
    slug: "discord",
    name: "Discord",
    categorySlug: "communicatie",
    status: "coming-soon",
    monthlyPriceEuro: 5,
    tagline: "Webhook-notificaties naar Discord — voor team-channels.",
    description: [
      "Voor teams op Discord (vooral hobby-verhuur of klein commercieel). Setup is een webhook-URL — geen OAuth nodig.",
    ],
    features: ["Webhook-based (geen OAuth)", "Embed-format", "Per event-type een aparte channel"],
    vendorUrl: "https://discord.com",
    iconifyId: "logos:discord-icon",
  },

  // ─── E-mail marketing ────────────────────────────────────────────────
  {
    slug: "mailchimp",
    name: "Mailchimp",
    categorySlug: "email-marketing",
    status: "coming-soon",
    monthlyPriceEuro: 9,
    tagline: "Klanten automatisch in je Mailchimp-audience.",
    description: [
      "Elke nieuwe klant die geboekt heeft (en opt-in heeft gegeven) wordt automatisch toegevoegd aan je Mailchimp-audience — met tags voor segmentatie per item-type.",
    ],
    features: [
      "Auto-subscribe na boeking (met opt-in)",
      "Tags per categorie / item",
      "Custom merge fields (laatste boeking, totaal besteed)",
    ],
    vendorUrl: "https://mailchimp.com",
    iconifyId: "logos:mailchimp",
  },
  {
    slug: "brevo",
    name: "Brevo (Sendinblue)",
    categorySlug: "email-marketing",
    status: "coming-soon",
    monthlyPriceEuro: 9,
    tagline: "EU-gehoste Mailchimp-alternative, AVG-vriendelijk.",
    description: [
      "Brevo is voor wie liever bij een Europese provider blijft (alle data in EU-datacenters). Zelfde functies als Mailchimp-koppeling.",
    ],
    features: ["EU-hosting", "Auto-segmentatie", "Transactional + marketing"],
    vendorUrl: "https://www.brevo.com",
    iconifyId: "logos:brevo",
  },
  {
    slug: "activecampaign",
    name: "ActiveCampaign",
    categorySlug: "email-marketing",
    status: "coming-soon",
    monthlyPriceEuro: 12,
    tagline: "Marketing-automation met getriggerde campagnes.",
    description: [
      "Voor wie verder gaat dan een nieuwsbrief — automation-flows die starten bij events (eerste boeking, geen boeking >6 mnd, etc.).",
    ],
    features: ["Event-getriggerde automations", "Contact-scoring", "CRM-deals sync"],
    vendorUrl: "https://www.activecampaign.com",
    iconifyId: "logos:active-campaign",
  },

  // ─── CRM ─────────────────────────────────────────────────────────────
  {
    slug: "hubspot",
    name: "HubSpot",
    categorySlug: "crm",
    status: "coming-soon",
    monthlyPriceEuro: 19,
    tagline: "Klanten en deals automatisch in HubSpot.",
    description: [
      "Voor sales-driven verhuurbedrijven die hun pijplijn in HubSpot beheren. Nieuwe leads via je BookingBay contact-formulier komen direct in HubSpot — met UTM-bron en boekingsgeschiedenis.",
    ],
    features: [
      "Contacts + Deals sync",
      "UTM-bron behouden",
      "Boekingsgeschiedenis als activity",
    ],
    vendorUrl: "https://www.hubspot.com",
    iconifyId: "logos:hubspot",
  },
  {
    slug: "pipedrive",
    name: "Pipedrive",
    categorySlug: "crm",
    status: "coming-soon",
    monthlyPriceEuro: 15,
    tagline: "Voor visuele sales-pipelines.",
    description: [
      "Pipedrive is populair bij MKB voor pijplijn-beheer. Leads en boekingen verschijnen als deals in je gekozen pipeline.",
    ],
    features: ["Deal per boeking (optioneel)", "Activity-log", "Custom fields"],
    vendorUrl: "https://www.pipedrive.com",
    iconifyId: "logos:pipedrive",
  },

  // ─── Office tools ────────────────────────────────────────────────────
  {
    slug: "google-drive",
    name: "Google Drive",
    categorySlug: "office-tools",
    status: "coming-soon",
    monthlyPriceEuro: 7,
    tagline: "Sla facturen en contracten automatisch op in Drive.",
    description: [
      "Elke gegenereerde PDF (factuur, contract, ophaal-checklist) wordt automatisch in een gestructureerde Drive-folder gezet — gesorteerd per maand of per klant.",
    ],
    features: [
      "Auto-upload PDF's",
      "Folder-structuur: /Jaar/Maand/Klant",
      "Gedeelde Drive support",
    ],
    vendorUrl: "https://drive.google.com",
    iconifyId: "logos:google-drive",
  },
  {
    slug: "dropbox",
    name: "Dropbox",
    categorySlug: "office-tools",
    status: "coming-soon",
    monthlyPriceEuro: 7,
    tagline: "Zelfde idee als Drive — voor Dropbox-teams.",
    description: [
      "Voor wie nog op Dropbox draait. Auto-upload van facturen en contracten.",
    ],
    features: ["Auto-upload", "Folder-templates", "Shared folders"],
    vendorUrl: "https://www.dropbox.com",
    iconifyId: "logos:dropbox",
  },
  {
    slug: "zapier",
    name: "Zapier",
    categorySlug: "office-tools",
    status: "coming-soon",
    monthlyPriceEuro: 9,
    tagline: "Koppel BookingBay aan 5000+ andere apps via Zapier.",
    description: [
      "Heb je een tool die wij (nog) niet ondersteunen? Via Zapier kun je BookingBay-events doorsluizen naar zo'n beetje elke SaaS — van Airtable tot Notion tot Trello.",
    ],
    features: ["Trigger: nieuwe boeking, annulering, lead", "Action: maak boeking aan", "5000+ apps"],
    vendorUrl: "https://zapier.com",
    iconifyId: "logos:zapier-icon",
  },

  // ─── Analytics ───────────────────────────────────────────────────────
  {
    slug: "google-analytics",
    name: "Google Analytics 4",
    categorySlug: "analytics",
    status: "coming-soon",
    monthlyPriceEuro: 7,
    tagline: "Meet boekingen als conversie-events in GA4.",
    description: [
      "Voor wie z'n marketing-uitgaven (Google Ads, social) wil koppelen aan échte boekingen. We sturen 'purchase'-events met de juiste waarde naar GA4.",
    ],
    features: [
      "purchase-event met EUR-waarde",
      "begin_checkout / add_to_cart funnel",
      "Consent-mode v2 compliant",
    ],
    vendorUrl: "https://analytics.google.com",
    iconifyId: "logos:google-analytics",
  },
  {
    slug: "plausible",
    name: "Plausible Analytics",
    categorySlug: "analytics",
    status: "coming-soon",
    monthlyPriceEuro: 7,
    tagline: "Privacy-vriendelijke analytics — geen cookie-banner nodig.",
    description: [
      "Voor wie AVG-vriendelijk wil meten zonder cookie-banner. Wij sturen custom-events naar Plausible bij elke boeking.",
    ],
    features: ["Custom goals", "Geen cookies", "EU-hosting"],
    vendorUrl: "https://plausible.io",
    iconifyId: "simple-icons:plausibleanalytics",
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────

const INTEGRATION_INDEX = new Map(INTEGRATIONS.map((i) => [i.slug, i]));
const CATEGORY_INDEX = new Map(CATEGORIES.map((c) => [c.slug, c]));

export function getIntegration(slug: string): IntegrationDef | undefined {
  return INTEGRATION_INDEX.get(slug);
}

export function getCategory(slug: string): IntegrationCategory | undefined {
  return CATEGORY_INDEX.get(slug);
}

export function integrationsByCategory(slug: string): IntegrationDef[] {
  return INTEGRATIONS.filter((i) => i.categorySlug === slug);
}

export function statusLabel(status: IntegrationStatus): string {
  if (status === "available") return "Beschikbaar";
  if (status === "beta") return "Beta";
  return "Binnenkort";
}

export function priceLabel(monthly: number): string {
  return `€${monthly}/m`;
}
