import {
  LegalPage,
  LegalTable,
  Section,
} from "@/components/marketing/LegalPage";
import { PrintButton } from "@/components/ui/PrintButton";
import { COMPANY, RETENTION, companyAddressLine } from "@/lib/company";

export const metadata = {
  title: "Verwerkersovereenkomst",
  description:
    "Verwerkersovereenkomst (DPA) tussen BookingBay (Fourwrd V.O.F.) en verhuurders — afspraken over de verwerking van persoonsgegevens van hun klanten.",
};

export default function DpaPage() {
  return (
    <LegalPage
      title="Verwerkersovereenkomst"
      lastUpdated={COMPANY.legalUpdated}
      actions={<PrintButton />}
    >
      <Section title="1. Partijen en toepassing">
        <p>
          Deze verwerkersovereenkomst is onderdeel van de{" "}
          <a href="/voorwaarden">algemene voorwaarden</a> en geldt tussen{" "}
          <strong>{COMPANY.legalName}</strong> ({companyAddressLine()}, KvK{" "}
          {COMPANY.kvk}), hierna &ldquo;verwerker&rdquo; of
          &ldquo;wij&rdquo;, en de klant die {COMPANY.brand} gebruikt, hierna
          &ldquo;verantwoordelijke&rdquo; of &ldquo;jij&rdquo;. Zij geldt voor
          alle persoonsgegevens van jouw klanten, leads en teamleden die wij
          in jouw opdracht verwerken (artikel 28 AVG). Door je account aan te
          maken ga je met deze overeenkomst akkoord; een handtekening is niet
          nodig. Op verzoek sturen we een ondertekend exemplaar.
        </p>
      </Section>

      <Section title="2. Wat wij in jouw opdracht verwerken">
        <LegalTable
          caption="Verwerkingen in opdracht van de verantwoordelijke"
          head={["Betrokkenen", "Gegevens", "Doel"]}
          rows={[
            [
              "Jouw klanten (huurders)",
              "Naam, e-mailadres, telefoonnummer, boekingen (item, datum/tijd, prijs, opmerkingen, betaalstatus en betaalkenmerk), portaal-link, opt-in voor reviewverzoek, notities die jij toevoegt",
              "Boekingen registreren, bevestigen, herinneren, betalen, klantportaal, reviewverzoek (alleen met opt-in), export",
            ],
            [
              "Leads (contactformulier)",
              "Naam, e-mailadres, telefoonnummer, bericht, gewenste periode",
              "Aanvragen doorgeven aan jou (dashboard, notificatie, e-mail)",
            ],
            [
              "Personen die jij in reviews noemt",
              "Naam, rol/plaats, citaat, datum van hun toestemming",
              "Tonen op jouw klantsite",
            ],
            [
              "Jouw teamleden",
              "Naam, e-mailadres, rol, handelingen (audit-log)",
              "Toegang tot het dashboard, aantoonbaarheid",
            ],
            [
              "Contacten in je Google-agenda (bij koppeling)",
              "Begin-/eindtijd, titel en id van afspraken in de gekoppelde agenda's",
              "Beschikbaarheid blokkeren, boekingen synchroniseren",
            ],
          ]}
        />
        <p>
          Wij verwerken deze gegevens uitsluitend om de dienst aan jou te
          leveren, voor support op jouw verzoek, voor beveiliging en voor
          niet-herleidbare productstatistiek. Wij gebruiken ze niet voor
          eigen marketing en verkopen ze niet.
        </p>
      </Section>

      <Section title="3. Jouw verantwoordelijkheden">
        <ul>
          <li>
            Jij bepaalt doel en middelen, hebt een grondslag voor de
            verwerking en informeert je klanten (bijvoorbeeld met een eigen
            privacyverklaring; die kun je in het dashboard koppelen zodat
            hij in de footer van je klantsite en in de boekwidget verschijnt).
          </li>
          <li>
            Jij verwijdert klanten en leads die je niet meer nodig hebt en
            handelt verzoeken van betrokkenen af; wij ondersteunen (zie 7).
          </li>
          <li>
            Reviews plaats je alleen met toestemming van de genoemde persoon;
            je legt de datum daarvan vast in het dashboard.
          </li>
          <li>
            Het reviewverzoek en de Google Calendar-koppeling zet je alleen
            aan als je daar zelf een grondslag voor hebt.
          </li>
        </ul>
      </Section>

      <Section title="4. Onze verplichtingen">
        <ul>
          <li>
            Wij verwerken alleen op jouw gedocumenteerde instructies (het
            gebruik van de functies van {COMPANY.brand} geldt als instructie)
            en niet buiten de EER, behalve via de in artikel 6 genoemde
            subverwerkers.
          </li>
          <li>
            Onze medewerkers zijn tot geheimhouding verplicht en hebben
            alleen toegang voor zover nodig voor support en beheer.
          </li>
          <li>
            Wij helpen je bij het nakomen van je verplichtingen (rechten van
            betrokkenen, beveiliging, meldplicht datalekken, DPIA) en
            verstrekken de informatie die daarvoor nodig is.
          </li>
          <li>
            Wij informeren je als een instructie naar ons oordeel in strijd
            is met de AVG.
          </li>
        </ul>
      </Section>

      <Section title="5. Beveiliging">
        <p>Wij treffen ten minste de volgende maatregelen:</p>
        <ul>
          <li>Hosting en database bij Hetzner in Duitsland; versleuteling in transit (TLS, HSTS).</li>
          <li>Wachtwoorden als bcrypt-hash; tweestapsverificatie beschikbaar voor alle gebruikers en verplicht voor onze beheerders.</li>
          <li>API-sleutels van betaalproviders, OAuth-tokens en tweestapsverificatie-geheimen versleuteld opgeslagen (AES-256-GCM).</li>
          <li>Toegang per rol (eigenaar, beheerder, manager, lezer) en een audit-log van handelingen.</li>
          <li>Beperking van inlogpogingen en van verzoeken op publieke formulieren; beveiligingsheaders.</li>
          <li>Dagelijkse back-ups van de database op onze server in de EU.</li>
          <li>Geüploade afbeeldingen worden van metadata ontdaan en worden bij verwijdering van de organisatie van de schijf verwijderd.</li>
        </ul>
      </Section>

      <Section title="6. Subverwerkers">
        <p>
          Je geeft algemene toestemming voor de volgende subverwerkers. Bij
          een wijziging informeren we je minimaal 30 dagen vooraf per e-mail
          of via het dashboard; je kunt dan gemotiveerd bezwaar maken en, als
          we geen oplossing vinden, opzeggen.
        </p>
        <LegalTable
          caption="Subverwerkers"
          head={["Subverwerker", "Land", "Doel", "Waarborg doorgifte"]}
          rows={[
            ["Hetzner Online GmbH", "Duitsland", "Hosting, database, back-ups", "Geen doorgifte (EU)"],
            ["Zoho Mail (Zoho Corporation)", "EU-datacenter", "Verzenden van e-mail (bevestigingen, herinneringen, reviewverzoek, notificaties)", "Geen doorgifte (EU)"],
            ["Mollie B.V.", "Nederland", "Online betalingen van jouw klanten, alleen als jij Mollie hebt gekoppeld (jouw eigen Mollie-account). Mollie is voor die betalingen jouw eigen verwerker/verantwoordelijke; wij geven bedrag, omschrijving en boekingsnummer door.", "Geen doorgifte (EU)"],
            ["Stripe Payments Europe Ltd / Stripe Inc.", "Ierland / VS", "Online betalingen van jouw klanten, alleen als jij Stripe hebt gekoppeld (jouw eigen Stripe-account)", "EU-VS Data Privacy Framework; standaardcontractbepalingen"],
            ["Google LLC", "VS", "Google Calendar-synchronisatie, alleen als jij de koppeling activeert", "EU-VS Data Privacy Framework; standaardcontractbepalingen"],
          ]}
        />
        <p>
          Voor de abonnementsbetaling die jij aan ons doet, gebruiken wij
          Mollie als verwerker van onze eigen administratie; dat valt onder
          onze <a href="/privacy">privacyverklaring</a>, niet onder deze
          verwerkersovereenkomst. Ons interne Discord-kanaal ontvangt geen
          persoonsgegevens van jouw klanten (alleen organisatienaam, id&apos;s
          en een link naar ons beheerpaneel). Websitestatistieken (Plausible,
          zelf gehost) meten wij niet op jouw klantsite, boekwidget of
          klantportaal.
        </p>
      </Section>

      <Section title="7. Rechten van betrokkenen">
        <p>
          Verzoeken van jouw klanten (inzage, correctie, verwijdering,
          overdracht, bezwaar) handel jij af. Het dashboard biedt daarvoor:
          klant- en boekingsgegevens inzien en bewerken, klanten en leads
          verwijderen, en boekingen exporteren als CSV. Ontvangen wij zelf
          zo&apos;n verzoek, dan sturen we het binnen vijf werkdagen naar jou
          door en helpen we waar nodig, tenzij de wet ons verplicht zelf te
          handelen.
        </p>
      </Section>

      <Section title="8. Beheerderstoegang en “inloggen als”">
        <p>
          Onze beheerders kunnen voor support en beheer de gegevens van jouw
          organisatie inzien in ons beheerpaneel en, als dat voor een
          supportvraag nodig is, tijdelijk als een van jouw gebruikers in het
          dashboard meekijken (&ldquo;inloggen als&rdquo;). Daarvoor geldt:
        </p>
        <ul>
          <li>alleen op jouw verzoek of om een storing of misbruik te onderzoeken;</li>
          <li>elke start en stop wordt in de audit-log van jouw organisatie vastgelegd en is voor jou zichtbaar onder Instellingen → Audit-log;</li>
          <li>de beheerder kan daarbij geen wachtwoorden of versleutelde sleutels lezen;</li>
          <li>beheerdersaccounts hebben verplicht tweestapsverificatie.</li>
        </ul>
        <p>
          Exports die wij vanuit het beheerpaneel maken (bijvoorbeeld een
          CSV van je klanten op jouw verzoek) worden na levering aan jou
          niet door ons bewaard.
        </p>
      </Section>

      <Section title="9. Datalekken">
        <p>
          Bij een inbreuk in verband met persoonsgegevens die wij in jouw
          opdracht verwerken, informeren we je zonder onredelijke vertraging
          en uiterlijk binnen 48 uur na ontdekking per e-mail aan de
          eigenaar(s) van je organisatie, met: wat er is gebeurd, welke
          gegevens en betrokkenen het betreft, de waarschijnlijke gevolgen en
          de maatregelen die wij hebben genomen. Wij helpen je met de melding
          bij de toezichthouder (binnen 72 uur) en aan betrokkenen. Ons
          interne draaiboek: inbreuk vaststellen en isoleren, omvang bepalen,
          sleutels en sessies roteren waar nodig, betrokken klanten
          informeren, oorzaak wegnemen en het incident vastleggen.
        </p>
      </Section>

      <Section title="10. Audit en informatie">
        <p>
          Op verzoek verstrekken wij de informatie die je nodig hebt om aan
          te tonen dat wij aan artikel 28 AVG voldoen (deze overeenkomst, de
          lijst met subverwerkers, een beschrijving van onze maatregelen).
          Eens per jaar, of vaker bij een concrete aanleiding, kun je op eigen
          kosten een audit laten uitvoeren door een onafhankelijke
          deskundige, na minimaal 30 dagen aankondiging en met inachtneming
          van de vertrouwelijkheid van andere klanten.
        </p>
      </Section>

      <Section title="11. Bewaren, teruggave en verwijdering">
        <ul>
          <li>
            Tijdens de overeenkomst bewaren wij de gegevens zolang jij ze in
            {" "}{COMPANY.brand} laat staan. Als vangnet anonimiseren wij
            klanten en boekingen automatisch {RETENTION.customerYears} jaar
            na de laatste boeking en wissen wij afgehandelde leads na{" "}
            {RETENTION.handledLeadMonths} maanden en de audit-log na{" "}
            {RETENTION.auditLogMonths} maanden.
          </li>
          <li>
            Je kunt je gegevens op elk moment exporteren (CSV) en je
            organisatie zelf verwijderen (Instellingen → Organisatie). Bij
            verwijdering wissen wij items, klanten, boekingen, leads,
            reviews, pagina&apos;s, koppelingen en de geüploade afbeeldingen
            van de schijf.
          </li>
          <li>
            Na het einde van je abonnement blijft je organisatie ten minste{" "}
            {RETENTION.orgGraceDays} dagen beschikbaar om te hervatten of te
            exporteren. Daarna verwijderen wij de organisatie op jouw verzoek;
            vraag je niet om verwijdering, dan blijft de omgeving bewaard
            zodat je kunt hervatten. Facturen en betaalgegevens bewaren wij{" "}
            {RETENTION.financeYears} jaar (fiscale bewaarplicht).
          </li>
          <li>
            Verwijderde gegevens kunnen nog in back-ups aanwezig zijn totdat
            die volgens onze back-upcyclus worden overschreven; back-ups
            worden alleen gebruikt voor herstel na een storing.
          </li>
        </ul>
      </Section>

      <Section title="12. Aansprakelijkheid en looptijd">
        <p>
          Voor aansprakelijkheid gelden de bepalingen van de{" "}
          <a href="/voorwaarden">algemene voorwaarden</a>. Deze overeenkomst
          loopt zolang wij persoonsgegevens in jouw opdracht verwerken en
          eindigt met de verwijdering van je organisatie. Op deze overeenkomst
          is Nederlands recht van toepassing.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Vragen over deze verwerkersovereenkomst of een verzoek van een
          betrokkene? Mail{" "}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
        </p>
      </Section>
    </LegalPage>
  );
}
