import {
  LegalPage,
  LegalTable,
  Section,
} from "@/components/marketing/LegalPage";
import { PrintButton } from "@/components/ui/PrintButton";
import { COMPANY, RETENTION, companyAddressLine } from "@/lib/company";

export const metadata = {
  title: "Privacyverklaring",
  description:
    "Welke persoonsgegevens BookingBay verwerkt, waarom, met wie ze worden gedeeld en hoe lang ze worden bewaard — voor bezoekers, verhuurders en hun klanten.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacyverklaring"
      lastUpdated={COMPANY.legalUpdated}
      actions={<PrintButton />}
    >
      <Section title="In het kort">
        <p>
          {COMPANY.brand} is boekingssoftware voor verhuurbedrijven. We
          verwerken alleen de gegevens die nodig zijn om de dienst te
          leveren, hosten in de Europese Unie en verkopen geen gegevens. Deze
          verklaring beschrijft precies wat we doen, in de volgorde waarin je
          het tegenkomt: als bezoeker van deze website, als verhuurder met een
          account, en als klant van een verhuurder die via {COMPANY.brand}{" "}
          boekt.
        </p>
      </Section>

      <Section id="verantwoordelijke" title="Wie is verantwoordelijk">
        <p>
          <strong>{COMPANY.legalName}</strong>, {companyAddressLine()}, KvK{" "}
          {COMPANY.kvk}, btw {COMPANY.vat}, is de verwerkingsverantwoordelijke
          voor de gegevens die wij zelf verwerken (bezoekers van deze site,
          accounts, abonnementen, support). Contact:{" "}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>,{" "}
          {COMPANY.phone}.
        </p>
        <p>
          Voor de gegevens die een verhuurder via {COMPANY.brand} verwerkt
          over zijn eigen klanten (boekingen, contactaanvragen, reviews) is
          die verhuurder de verantwoordelijke en zijn wij verwerker. Daarvoor
          geldt onze{" "}
          <a href="/verwerkersovereenkomst">verwerkersovereenkomst</a>; zie
          ook de paragraaf{" "}
          <a href="#eindklanten">Klanten van verhuurders</a> hieronder.
        </p>
      </Section>

      <Section id="verwerkingen" title="Wat wij verwerken, waarom en hoe lang">
        <p>
          Onderstaande tabel geldt voor bezoekers van deze website en voor
          verhuurders (en hun teamleden) met een account. Bewaartermijnen
          worden door een dagelijkse opruimtaak toegepast, tenzij anders
          vermeld.
        </p>
        <LegalTable
          caption="Verwerkingen van BookingBay als verantwoordelijke"
          head={["Doel", "Grondslag", "Gegevens", "Ontvangers", "Bewaartermijn"]}
          rows={[
            [
              "Account aanmaken en inloggen",
              "Uitvoering van de overeenkomst",
              "Naam, e-mailadres, wachtwoord (bcrypt-hash), optioneel tweestapsverificatie-geheim (versleuteld) en back-upcodes (gehasht), tijdstip van registratie",
              "Hetzner (hosting), Zoho Mail (verificatie- en wachtwoordmails)",
              "Zolang het account bestaat. Je verwijdert je account zelf via Instellingen → Profiel.",
            ],
            [
              "Organisatie, abonnement en facturatie",
              "Uitvoering van de overeenkomst; wettelijke plicht (fiscale bewaarplicht)",
              "Organisatienaam, plan, proefperiode, facturatiegegevens (bedrijfsnaam, adres, factuur-e-mail, optioneel btw-nummer), betaalstatus, betaal-id, bedrag en betaalmethode van Mollie",
              "Mollie (betaling en incassomandaat: naam en e-mailadres van de eigenaar, bedrag), Hetzner",
              `Facturen en betaalgegevens ${RETENTION.financeYears} jaar (wettelijk). Overige gegevens zolang de organisatie bestaat: na het einde van abonnement of proefperiode nog ${RETENTION.orgDeleteMonths} maanden, daarna wordt de organisatie automatisch verwijderd (${RETENTION.orgDeleteWarnDays} dagen vooraf per e-mail aangekondigd).`,
            ],
            [
              "Support en contact",
              "Uitvoering van de overeenkomst; gerechtvaardigd belang (vragen beantwoorden)",
              "Naam, e-mailadres, telefoonnummer (als je dat opgeeft), inhoud van je bericht of ticket",
              "Zoho Mail, Hetzner. Ons interne Discord-kanaal krijgt alleen een melding met organisatienaam, ticket-id en een link naar ons beheerpaneel — geen namen, adressen of berichtinhoud.",
              "Tickets zolang de organisatie bestaat. Contactformulier-mails in onze mailbox tot afhandeling.",
            ],
            [
              "Audit-log van handelingen in het dashboard",
              "Gerechtvaardigd belang (beveiliging, aantoonbaarheid, fraudepreventie)",
              "Gebruikers-id, actie, tijdstip, betrokken record; bij leads en herinneringen ook het e-mailadres van de betrokken klant",
              "Hetzner",
              `${RETENTION.auditLogMonths} maanden, daarna automatisch gewist.`,
            ],
            [
              "Servicemededelingen en e-mails",
              "Uitvoering van de overeenkomst (transactioneel); gerechtvaardigd belang (servicemededelingen); toestemming (productnieuws)",
              "E-mailadres, naam",
              "Zoho Mail",
              "Transactionele mails (verificatie, wachtwoord, uitnodiging, verlenging, incasso-aankondiging, factuur, ticketreactie) horen bij je account. Algemene mededelingen kun je per e-mail afmelden via de link in de mail; productnieuws sturen we alleen na opt-in in je profiel.",
            ],
            [
              "Websitestatistieken",
              "Gerechtvaardigd belang (weten hoe de site wordt gebruikt)",
              "Geanonimiseerde paginaweergaven; geen cookies, geen individuele profielen",
              "Niemand — Plausible draait op onze eigen server (stats.fourwrd.nl, Hetzner, EU). Volgens de standaardwerking van Plausible wordt het IP-adres niet opgeslagen maar alleen tijdelijk gebruikt voor een dagelijks wisselende, niet-herleidbare telling.",
              "Statistieken zijn niet tot personen herleidbaar.",
            ],
            [
              "Technische serverlogs",
              "Gerechtvaardigd belang (beveiliging, storingsanalyse)",
              "IP-adres, tijdstip, opgevraagde URL, browser — alleen op de webserver, niet in de applicatie-database",
              "Hetzner",
              "Kort, alleen voor het onderzoeken van storingen en misbruik.",
            ],
            [
              "Beveiliging (inlogpogingen, misbruik)",
              "Gerechtvaardigd belang",
              "Aantal mislukte inlogpogingen per e-mailadres, aantal verzoeken per IP-adres op publieke formulieren",
              "Hetzner",
              "Tellers vervallen automatisch na maximaal 15 minuten; oude tellers worden dagelijks opgeruimd.",
            ],
            [
              "Sales-contact met bedrijven die nog geen klant zijn",
              "Gerechtvaardigd belang (zakelijke acquisitie). Je kunt altijd bezwaar maken.",
              "Naam contactpersoon, bedrijfsnaam, zakelijk e-mailadres en telefoonnummer, bron van het contact, gespreksnotities. Bron: eigen contact met ons, een verwijzing of openbare bedrijfsgegevens.",
              "Hetzner. Ons interne Discord-kanaal krijgt alleen bedrijfsnaam en id.",
              `${RETENTION.prospectMonths} maanden na het laatste contact zonder vervolg, daarna automatisch gewist; bij klantwording gaan de gegevens over naar het klantdossier.`,
            ],
          ]}
        />
        <p>
          <strong>Verplichte gegevens.</strong> Zonder naam en e-mailadres
          kun je geen account aanmaken; zonder bedrijfsnaam en adres kunnen we
          geen factuur maken en dus geen betaald abonnement starten. Alle
          andere velden zijn optioneel.
        </p>
        <p>
          <strong>Geautomatiseerde besluitvorming.</strong> We nemen geen
          besluiten met rechtsgevolgen op basis van uitsluitend
          geautomatiseerde verwerking en maken geen profielen.
        </p>
        <p>
          <strong>Demo-omgeving.</strong> De demo op deze site gebruikt
          fictieve bedrijven en personen.
        </p>
      </Section>

      <Section id="eindklanten" title="Klanten van verhuurders (eindklanten)">
        <p>
          Boek je via een klantsite of boekwidget van een verhuurder, of
          stuur je daar een contactaanvraag, dan is <strong>die verhuurder</strong>{" "}
          de verantwoordelijke voor je gegevens. Zijn contactgegevens en
          (als hij die heeft ingesteld) zijn eigen voorwaarden en
          privacyverklaring staan in de footer van zijn site en boven de
          boekknop. {COMPANY.brand} verwerkt je gegevens in opdracht van de
          verhuurder. Concreet doen wij het volgende:
        </p>
        <ul>
          <li>
            <strong>Opslag</strong> van je boeking (naam, e-mailadres,
            telefoonnummer als de verhuurder dat verplicht stelt, gekozen
            item, datum en tijd, opmerkingen, prijs, betaalstatus) en van
            contactaanvragen, op onze servers bij Hetzner in Duitsland.
          </li>
          <li>
            <strong>E-mails namens de verhuurder</strong>: een
            boekingsbevestiging met een persoonlijke link naar je boeking
            (alleen als de verhuurder het klantportaal aan heeft) en een
            herinnering ongeveer een dag voor de start. Deze mails worden
            vanaf een {COMPANY.brand}-adres verzonden en vermelden de naam
            van de verhuurder.
          </li>
          <li>
            <strong>Reviewverzoek</strong>: alleen als je bij het boeken het
            (niet vooraf aangevinkte) vakje &ldquo;Stuur mij na afloop een
            reviewverzoek&rdquo; hebt aangezet én de verhuurder deze functie
            gebruikt. Elke reviewmail bevat een afmeldlink.
          </li>
          <li>
            <strong>Online betalen</strong>: kies je voor online betalen, dan
            word je doorgestuurd naar de betaalomgeving van de betaalprovider
            van de verhuurder (Mollie of Stripe). Wij geven daarbij alleen het
            bedrag, een omschrijving en het boekingsnummer door; je
            bankgegevens gaan rechtstreeks naar de betaalprovider en zien wij
            niet. Bewaar de betaalstatus en het betaalkenmerk bij de boeking.
          </li>
          <li>
            <strong>Agenda van de verhuurder</strong>: heeft de verhuurder
            Google Calendar gekoppeld, dan zet {COMPANY.brand} je boeking
            (itemnaam, je naam, datum/tijd, opmerkingen en je e-mailadres als
            genodigde) in de door hem gekozen Google-agenda.
          </li>
          <li>
            <strong>Geen statistieken of tracking</strong>: op klantsites, in
            de boekwidget en in het klantportaal laden wij geen
            analytics-script. Kaarten (Google Maps) en video&apos;s (YouTube,
            Vimeo) op een klantsite worden pas geladen nadat je daar zelf op
            klikt; tot dat moment gaat er niets naar Google, YouTube of Vimeo.
          </li>
          <li>
            <strong>Bewaren</strong>: de verhuurder bepaalt hoe lang je
            gegevens worden bewaard en kan ze zelf verwijderen. Als vangnet
            anonimiseren wij klant- en boekingsgegevens automatisch{" "}
            {RETENTION.customerYears} jaar na de laatste boeking (fiscale
            bewaartermijn van de verhuurder) en wissen we afgehandelde
            contactaanvragen na {RETENTION.handledLeadMonths} maanden.
          </li>
        </ul>
        <p>
          Wil je je gegevens inzien, laten corrigeren of verwijderen? Neem
          contact op met de verhuurder. Kom je er samen niet uit, mail dan{" "}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>; wij helpen
          de verhuurder om je verzoek uit te voeren.
        </p>
      </Section>

      <Section id="google-calendar" title="Google Calendar-koppeling">
        <p>
          Verhuurders kunnen hun Google-agenda koppelen. Dat gebeurt alleen op
          hun eigen initiatief via het toestemmingsscherm van Google. Wij
          vragen daarbij de rechten &ldquo;agenda-afspraken bekijken en
          bewerken&rdquo; en het e-mailadres van het Google-account.
        </p>
        <ul>
          <li>
            <strong>Wat we ophalen:</strong> de lijst met agenda&apos;s van
            het account (om er één te kiezen) en de afspraken in de gekozen
            agenda&apos;s: begin- en eindtijd, titel en afspraak-id.
          </li>
          <li>
            <strong>Waarvoor:</strong> boekingen als afspraak in de agenda
            zetten en afspraken uit de agenda als &ldquo;niet
            beschikbaar&rdquo; in {COMPANY.brand} tonen, zodat er geen
            dubbele boekingen ontstaan.
          </li>
          <li>
            <strong>Wat we opslaan:</strong> de toegangs- en
            vernieuwingstokens (versleuteld met AES-256-GCM), het
            account-e-mailadres, de gekozen agenda-id&apos;s en per externe
            afspraak de begin-/eindtijd, titel en afspraak-id.
          </li>
          <li>
            <strong>Wat we níet doen:</strong> Google-gegevens delen met
            derden, gebruiken voor advertenties of voor iets anders dan de
            synchronisatie hierboven.
          </li>
          <li>
            <strong>Stoppen:</strong> pauzeer of verwijder de koppeling in
            Dashboard → Koppelingen; wij trekken dan de toegang bij Google in
            en stoppen de synchronisatie. Je kunt de toegang ook zelf
            intrekken via de beveiligingsinstellingen van je Google-account.
          </li>
        </ul>
        <p>
          Het gebruik van gegevens uit Google-API&apos;s voldoet aan het{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            rel="noopener noreferrer"
            target="_blank"
          >
            Google API Services User Data Policy
          </a>
          , inclusief de eisen voor beperkt gebruik (Limited Use).
        </p>
      </Section>

      <Section id="ontvangers" title="Ontvangers en subverwerkers">
        <p>
          Wij schakelen de volgende partijen in. Met elke verwerker is een
          verwerkersovereenkomst of gelijkwaardige afspraak gesloten. Buiten
          de EER verwerken we alleen bij Google en Stripe, en alleen wanneer
          een verhuurder die koppeling zelf activeert.
        </p>
        <LegalTable
          caption="Ontvangers en subverwerkers"
          head={["Partij", "Land", "Waarvoor", "Doorgifte"]}
          rows={[
            [
              "Hetzner Online GmbH",
              "Duitsland (EU)",
              "Hosting van de applicatie en database, dagelijkse back-ups van de database op onze server",
              "Geen (EU)",
            ],
            [
              "Zoho Mail (Zoho Corporation)",
              "EU-datacenter",
              "Verzenden van alle e-mail (transactioneel en service)",
              "Geen (EU)",
            ],
            [
              "Mollie B.V.",
              "Nederland",
              "Abonnementsbetalingen en incassomandaten van verhuurders; daarnaast online betalingen van eindklanten als de verhuurder Mollie heeft gekoppeld (met zijn eigen Mollie-account)",
              "Geen (EU)",
            ],
            [
              "Stripe Payments Europe Ltd / Stripe Inc.",
              "Ierland / Verenigde Staten",
              "Alleen online betalingen van eindklanten als de verhuurder Stripe heeft gekoppeld (met zijn eigen Stripe-account); wij gebruiken Stripe niet voor onze abonnementen",
              "Stripe is gecertificeerd onder het EU-VS Data Privacy Framework en hanteert standaardcontractbepalingen",
            ],
            [
              "Google LLC (Google Calendar)",
              "Verenigde Staten",
              "Agenda-synchronisatie, alleen als de verhuurder de koppeling activeert",
              "Google is gecertificeerd onder het EU-VS Data Privacy Framework en hanteert standaardcontractbepalingen",
            ],
            [
              "Plausible Analytics (zelf gehost)",
              "Duitsland (EU), eigen server",
              "Cookieloze websitestatistieken van bookingbay.nl en het dashboard",
              "Geen — geen derde partij betrokken",
            ],
            [
              "Discord Inc.",
              "Verenigde Staten",
              "Intern meldingskanaal voor ons team. De meldingen bevatten geen persoonsgegevens: alleen organisatienaam, id's en een link naar ons beheerpaneel.",
              "Niet van toepassing (geen persoonsgegevens)",
            ],
            [
              "Google Maps, YouTube, Vimeo",
              "Verenigde Staten",
              "Alleen op klantsites waar de verhuurder een kaart- of videoblok heeft geplaatst, en pas nadat de bezoeker op “laden” klikt",
              "Bij klikken ontvangt de aanbieder je IP-adres en kan hij cookies plaatsen; dat staat bij het blok vermeld",
            ],
          ]}
        />
      </Section>

      <Section id="cookies" title="Cookies en lokale opslag">
        <p>
          We gebruiken alleen functionele cookies die nodig zijn om in te
          loggen en het dashboard te laten werken. Er zijn geen
          advertentie- of trackingcookies, en voor statistieken gebruiken we
          geen cookies. Daarom vragen we geen cookietoestemming.
        </p>
        <LegalTable
          caption="Cookies en lokale opslag"
          head={["Naam", "Doel", "Duur", "Waar"]}
          rows={[
            [
              <code key="c1">__Host-authjs.csrf-token</code>,
              "Beveiliging van inlog- en formulierverzoeken (CSRF)",
              "Sessie",
              "Alle pagina's",
            ],
            [
              <code key="c2">__Secure-authjs.callback-url</code>,
              "Onthoudt waar je na het inloggen naartoe moet",
              "Sessie",
              "Alle pagina's",
            ],
            [
              <code key="c3">__Secure-authjs.session-token</code>,
              "Je ingelogde sessie (versleuteld token)",
              "30 dagen",
              "Dashboard, admin",
            ],
            [
              <code key="c4">bb_active_org</code>,
              "Welke organisatie je in het dashboard actief hebt",
              "1 jaar",
              "Dashboard",
            ],
            [
              <code key="c5">bb_2fa_pending</code>,
              "Tijdelijk token tijdens tweestapsverificatie",
              "Maximaal 5 minuten",
              "Inloggen",
            ],
            [
              <code key="c6">bb_gc_oauth_state</code>,
              "Beveiliging van de Google Calendar-koppeling (samen met bb_gc_oauth_org)",
              "10 minuten",
              "Dashboard → Koppelingen",
            ],
            [
              <code key="c7">bb_impersonate</code>,
              "Alleen bij onze beheerders die met toestemming “inloggen als” gebruiken (zie verwerkersovereenkomst)",
              "Beheerderssessie",
              "Admin",
            ],
            [
              <code key="c8">bb-calendar-business-hours</code> ,
              "Voorkeur planningweergave (browseropslag, geen cookie)",
              "Tot je browseropslag wist",
              "Dashboard → Planning",
            ],
          ]}
        />
        <p>
          Op klantsites van verhuurders, in de boekwidget en in het
          klantportaal plaatsen wij zelf geen cookies. Cookies van Google
          Maps, YouTube of Vimeo kunnen alleen ontstaan nadat je zelf op
          &ldquo;laden&rdquo; klikt bij zo&apos;n blok.
        </p>
      </Section>

      <Section id="beveiliging" title="Beveiliging">
        <ul>
          <li>Alle verbindingen lopen via HTTPS (TLS) met HSTS.</li>
          <li>
            Wachtwoorden worden als bcrypt-hash opgeslagen; tweestapsverificatie
            is beschikbaar voor alle gebruikers en verplicht voor onze
            beheerders.
          </li>
          <li>
            API-sleutels van betaalproviders, OAuth-tokens en
            tweestapsverificatie-geheimen zijn versleuteld opgeslagen
            (AES-256-GCM).
          </li>
          <li>
            Inlogpogingen en publieke formulieren zijn beperkt in aantal per
            e-mailadres en IP-adres.
          </li>
          <li>
            Handelingen in het dashboard worden gelogd (audit-log) en toegang
            is per rol beperkt.
          </li>
          <li>Dagelijkse back-ups van de database op onze server in de EU.</li>
        </ul>
        <p>
          <strong>Datalek.</strong> Bij een (vermoeden van een) inbreuk
          beoordelen wij direct de omvang, beperken we de gevolgen, melden we
          waar vereist binnen 72 uur bij de Autoriteit Persoonsgegevens en
          informeren we de betrokken verhuurders binnen 48 uur na ontdekking
          (zie verwerkersovereenkomst) en, als dat nodig is, de betrokkenen.
          Beveiligingsproblemen kun je melden via{" "}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> (zie ook{" "}
          <a href="/.well-known/security.txt">security.txt</a>).
        </p>
      </Section>

      <Section id="rechten" title="Jouw rechten">
        <p>
          Je hebt recht op inzage, correctie, verwijdering, beperking, bezwaar
          en overdracht van je gegevens, en je kunt een gegeven toestemming
          altijd intrekken. Verhuurders kunnen hun eigen account verwijderen
          via Instellingen → Profiel en hun organisatie via Instellingen →
          Organisatie; boekingen en klanten zijn in het dashboard te
          exporteren (CSV). Voor andere verzoeken mail je{" "}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>. We
          reageren binnen een maand.
        </p>
        <p>
          Niet tevreden over de afhandeling? Dan kun je een klacht indienen
          bij de{" "}
          <a
            href="https://www.autoriteitpersoonsgegevens.nl"
            rel="noopener noreferrer"
            target="_blank"
          >
            Autoriteit Persoonsgegevens
          </a>{" "}
          (Nederland) of, als je in België woont of gevestigd bent, bij de{" "}
          <a
            href="https://www.gegevensbeschermingsautoriteit.be"
            rel="noopener noreferrer"
            target="_blank"
          >
            Gegevensbeschermingsautoriteit
          </a>
          .
        </p>
      </Section>

      <Section title="Wijzigingen">
        <p>
          We passen deze verklaring aan als onze dienst of de wetgeving
          verandert. De actuele versie staat altijd op deze pagina; de datum
          bovenaan is de datum van de laatste wijziging. Bij ingrijpende
          wijzigingen informeren we accounthouders per e-mail of via het
          dashboard.
        </p>
      </Section>
    </LegalPage>
  );
}
