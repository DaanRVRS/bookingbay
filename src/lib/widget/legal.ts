/**
 * Juridische instellingen van de verhuurder voor de boekwidget. Client- en
 * server-safe (geen imports). Wordt door de server-pagina's (/book, embed,
 * Boek-widget-blok) uit de organisatie afgeleid en als prop aan de widget
 * gegeven; de server dwingt dezelfde regels af in createPublicBooking.
 */
export interface WidgetLegal {
  /** Voorwaarden van de verhuurder. Gezet = verplichte checkbox. */
  termsUrl: string | null;
  /** Privacyverklaring van de verhuurder (link in de consentregel). */
  privacyUrl: string | null;
  /** Telefoonnummer verplicht ("nodig voor de ophaalafspraak"). */
  phoneRequired: boolean;
  /** Leeftijdsvinkje "Ik ben 18 jaar of ouder" tonen en afdwingen. */
  ageCheck: boolean;
  /** Vinkje "Stuur mij na afloop een reviewverzoek" tonen (niet vooraf aangevinkt). */
  reviewOptIn: boolean;
}

export const DEFAULT_WIDGET_LEGAL: WidgetLegal = {
  termsUrl: null,
  privacyUrl: null,
  phoneRequired: true,
  ageCheck: false,
  reviewOptIn: false,
};

interface OrgLegalFields {
  termsUrl: string | null;
  privacyUrl: string | null;
  widgetPhoneRequired: boolean;
  widgetAgeCheckEnabled: boolean;
  reviewRequestEnabled: boolean;
}

function httpUrlOrNull(v: string | null): string | null {
  if (!v) return null;
  const s = v.trim();
  return /^https?:\/\//i.test(s) ? s : null;
}

export function widgetLegalFromOrg(org: OrgLegalFields): WidgetLegal {
  return {
    termsUrl: httpUrlOrNull(org.termsUrl),
    privacyUrl: httpUrlOrNull(org.privacyUrl),
    phoneRequired: org.widgetPhoneRequired,
    ageCheck: org.widgetAgeCheckEnabled,
    reviewOptIn: org.reviewRequestEnabled,
  };
}
