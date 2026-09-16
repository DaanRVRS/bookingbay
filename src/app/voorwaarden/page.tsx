import Link from "next/link";
import {
  HighlightSection,
  LegalPage,
  Section,
} from "@/components/marketing/LegalPage";
import { PrintButton } from "@/components/ui/PrintButton";
import { COMPANY, RETENTION, companyAddressLine } from "@/lib/company";
import { PLAN_LIMITS, formatEuroNL, exclVat } from "@/lib/plans";

export const metadata = {
  title: "Algemene voorwaarden",
  description:
    "Algemene voorwaarden van BookingBay — de afspraken tussen jou als verhuurder en Fourwrd V.O.F. over het gebruik van de software.",
};

export default function VoorwaardenPage() {
  const starter = PLAN_LIMITS.STARTER.monthlyPriceEuro;
  return (
    <LegalPage
      title="Algemene voorwaarden"
      lastUpdated={COMPANY.legalUpdated}
      actions={<PrintButton />}
    >
      <Section title="1. Wie zijn wij en voor wie gelden deze voorwaarden">
        <p>
          {COMPANY.brand} is software-as-a-service voor verhuurbedrijven en
          wordt geleverd door <strong>{COMPANY.legalName}</strong>,{" "}
          {companyAddressLine()}, ingeschreven bij de Kamer van Koophandel
          onder nummer {COMPANY.kvk}, btw-nummer {COMPANY.vat}. Vragen kun je
          sturen naar <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>{" "}
          of bel {COMPANY.phone}.
        </p>
        <p>
          Deze voorwaarden gelden voor iedereen die een account aanmaakt of
          gebruikmaakt van onze diensten (&ldquo;klant&rdquo;,
          &ldquo;jij&rdquo;). Door je account aan te maken bevestig je dat je
          deze voorwaarden hebt gelezen en accepteert. Je kunt ze bovenaan
          deze pagina opslaan als PDF of afdrukken.
        </p>
        <p>
          <strong>Uitsluitend voor ondernemers.</strong> {COMPANY.brand} is
          bestemd voor gebruik in de uitoefening van een bedrijf of beroep. Je
          verklaart dat je handelt als ondernemer. Bepalingen van
          consumentenrecht zijn niet van toepassing op de overeenkomst tussen
          jou en ons. Voor de relatie tussen jou en jouw eigen klanten
          (consumenten die via jouw site boeken) ben jij verantwoordelijk;
          zie artikel 7.
        </p>
      </Section>

      <Section title="2. Onze dienst">
        <p>
          Wij leveren toegang tot het {COMPANY.brand}-platform: dashboard,
          planning, boekingsbeheer, klantsite, boekwidget, klantportaal en
          bijbehorende functies zoals beschreven op onze website. We doen ons
          best om de dienst stabiel, veilig en up-to-date te houden, maar
          leveren de dienst &ldquo;zoals beschikbaar&rdquo;. Koppelingen die
          op de website als &ldquo;binnenkort&rdquo; staan, maken geen deel
          uit van de dienst totdat ze beschikbaar zijn.
        </p>
        <p>
          We mogen functies toevoegen, wijzigen of weghalen. Bij ingrijpende
          wijzigingen die jouw gebruik raken laten we het minimaal 30 dagen
          van tevoren weten.
        </p>
      </Section>

      <Section title="3. Account en gebruik">
        <p>
          Je bent zelf verantwoordelijk voor de gegevens die je in je account
          zet, voor de geheimhouding van je inloggegevens en voor wat
          teamleden doen onder jouw organisatie. Je gebruikt{" "}
          {COMPANY.brand} niet voor:
        </p>
        <ul>
          <li>activiteiten in strijd met de wet of de openbare orde;</li>
          <li>het verzenden van spam of misleidende communicatie;</li>
          <li>het reverse-engineeren, scrapen of overbelasten van het platform;</li>
          <li>opslag of publicatie van content waarvoor je geen rechten hebt of die inbreuk maakt op rechten van anderen.</li>
        </ul>
      </Section>

      <Section title="4. Proefperiode, tarieven en betaling">
        <p>
          <strong>Proefperiode.</strong> Een nieuw account start met 14 dagen
          gratis proberen zonder betaalmiddel. Er wordt niets automatisch
          omgezet: het abonnement start pas als jij in het dashboard een plan
          kiest en de eerste betaling afrondt. Na de proefperiode (plus een
          respijt van 7 dagen) wordt een account zonder abonnement
          alleen-lezen.
        </p>
        <p>
          <strong>Tarieven.</strong> Tarieven staan op{" "}
          <Link href="/#pricing">onze prijzenpagina</Link> en zijn{" "}
          <strong>inclusief btw</strong>, tenzij anders vermeld; op de
          prijzenpagina en op je factuur staat ook het bedrag exclusief btw
          (bijvoorbeeld Starter: {formatEuroNL(starter)} per maand inclusief,{" "}
          {formatEuroNL(exclVat(starter))} exclusief 21% btw). Koppelingen
          hebben een eigen maandprijs die op de koppelingenpagina staat. We
          mogen tarieven jaarlijks aanpassen; we melden dat minimaal 30 dagen
          vooraf, waarna je kunt opzeggen als je het er niet mee eens bent.
        </p>
        <p>
          <strong>Automatische incasso via Mollie.</strong> Je betaalt per
          maand vooraf. Bij het starten van je abonnement doe je een eerste
          betaling (iDEAL of kaart) via Mollie; daarmee geef je Mollie een
          doorlopende machtiging om het maandbedrag automatisch af te
          schrijven van de gebruikte rekening of kaart. De machtiging loopt
          door totdat je opzegt. Concreet:
        </p>
        <ul>
          <li>
            <strong>Bedrag:</strong> het maandbedrag van je plan plus je
            actieve koppelingen, inclusief btw, zoals getoond op de
            facturatiepagina vóór de eerste betaling.
          </li>
          <li>
            <strong>Datum:</strong> de eerste automatische afschrijving is 30
            dagen na je eerste betaling; daarna telkens een maand later. De
            eerstvolgende datum staat altijd op je facturatiepagina.
          </li>
          <li>
            <strong>Vooraankondiging:</strong> drie dagen vóór elke
            afschrijving sturen we een e-mail met bedrag, datum en
            omschrijving (&ldquo;{COMPANY.brand}-abonnement&rdquo;). Wissel je
            van plan of koppeling, dan zie je het nieuwe maandbedrag direct in
            het dashboard en in de eerstvolgende vooraankondiging; bij een
            upgrade wordt het verschil voor de rest van de lopende maand
            direct via je machtiging verrekend, zoals in het bevestigingsscherm
            staat.
          </li>
          <li>
            <strong>Factuur:</strong> na elke geslaagde betaling maken we een
            factuur aan die je in het dashboard vindt (Instellingen → Plan
            &amp; facturatie).
          </li>
        </ul>
        <p>
          <strong>Mislukte betaling.</strong> Lukt een afschrijving niet, dan
          probeert Mollie het nog enkele dagen opnieuw en zie je een melding
          in je dashboard. Lukt het binnen 7 dagen na de verlengdatum niet,
          dan stopt het abonnement automatisch en wordt je account
          alleen-lezen. Je hoeft dan niets op te zeggen.
        </p>
        <p>
          <strong>Weer beginnen.</strong> Je kunt later opnieuw een
          abonnement starten; je gegevens zijn dan weer beschikbaar (zie
          artikel 6).
        </p>
      </Section>

      <Section title="5. Looptijd en opzegging">
        <p>
          Je abonnement loopt per maand en wordt telkens stilzwijgend met een
          maand verlengd totdat je opzegt. Opzeggen doe je zelf in het
          dashboard (Instellingen → Plan &amp; facturatie → Abonnement
          opzeggen). De opzegging gaat in aan het einde van de lopende
          betaalde maand; tot die datum blijft alles werken en wordt er niets
          meer afgeschreven. Reeds betaalde maanden worden niet terugbetaald,
          behalve waar de wet ons daartoe verplicht. Tot de einddatum kun je
          de opzegging ongedaan maken.
        </p>
        <p>
          Wij mogen de overeenkomst beëindigen bij ernstige of herhaalde
          overtreding van deze voorwaarden, met voorafgaande kennisgeving
          waar dat redelijk is.
        </p>
      </Section>

      <Section title="6. Jouw data en intellectuele eigendom">
        <p>
          <strong>Jouw data blijft van jou.</strong> Alle gegevens en content
          die jij in {COMPANY.brand} zet (klanten, items, boekingen, teksten,
          afbeeldingen, reviews) blijven jouw eigendom. Je geeft ons alleen
          het recht om die te hosten, te tonen en te verwerken voor zover
          nodig om de dienst te leveren en support te geven. Wij gebruiken je
          data niet voor eigen marketing en verkopen ze niet.
        </p>
        <p>
          <strong>Het platform blijft van ons.</strong> Alle rechten op de
          software, de vormgeving, de merknaam {COMPANY.brand} en de
          documentatie berusten bij {COMPANY.legalName} of onze licentiegevers.
          Je krijgt voor de duur van de overeenkomst een niet-exclusieve,
          niet-overdraagbare licentie om het platform voor je eigen bedrijf
          te gebruiken, inclusief het plaatsen van de boekwidget op je eigen
          website. Kopiëren, doorverkopen of aanbieden aan derden is niet
          toegestaan.
        </p>
        <p>
          <strong>Export en verwijdering.</strong> Je kunt op elk moment
          boekingen en klanten exporteren (CSV) en je organisatie zelf
          verwijderen. Na het einde van je abonnement of proefperiode blijft
          je organisatie {RETENTION.orgDeleteMonths} maanden beschikbaar om
          te hervatten of te exporteren; daarna verwijderen wij de
          organisatie automatisch. {RETENTION.orgDeleteWarnDays} dagen vóór
          die verwijdering sturen we alle eigenaren een e-mail met de datum
          en hoe je het voorkomt (abonnement hervatten). Facturen bewaren wij{" "}
          {RETENTION.financeYears} jaar (wettelijke bewaarplicht). Verdere
          afspraken over persoonsgegevens staan in de{" "}
          <a href="/verwerkersovereenkomst">verwerkersovereenkomst</a>.
        </p>
      </Section>

      <Section title="7. Inhoud van klanten, meldingen en jouw eigen klanten">
        <p>
          <strong>Jouw klantsite is jouw uiting.</strong> Wij hosten de
          klantsites, foto&apos;s, teksten en reviews die jij publiceert, maar
          controleren die niet vooraf. Jij bent verantwoordelijk dat die
          inhoud rechtmatig is: geen inbreuk op auteursrecht, portretrecht of
          merkrecht, geen misleidende informatie en geen onrechtmatige
          uitingen.
        </p>
        <p>
          <strong>Reviews.</strong> Je toont alleen echte beoordelingen van
          echte klanten, met toestemming van de genoemde persoon (je legt de
          datum daarvan vast in het dashboard). Onder het Reviews-blok op je
          klantsite staat dat de reviews door jou zijn geplaatst en niet door
          {" "}{COMPANY.brand} zijn geverifieerd.
        </p>
        <p>
          <strong>Meldingen.</strong> Iedereen kan via{" "}
          <Link href="/melding">bookingbay.nl/melding</Link> (gelinkt in de footer
          van elke klantsite en het klantportaal) of via{" "}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> melden dat
          inhoud op een klantsite onrechtmatig is. Dat adres is ook ons
          contactpunt voor autoriteiten. Wij bevestigen de ontvangst,
          beoordelen de melding zorgvuldig en zonder onnodige vertraging, en
          kunnen inhoud verbergen of verwijderen of een organisatie
          opschorten als wij dat nodig vinden. Voordat wij ingrijpen, of
          direct daarna als de situatie spoed vereist, informeren we jou per
          e-mail over wat we hebben gedaan en waarom. Je kunt daarop binnen 14
          dagen reageren via hetzelfde adres; wij heroverwegen dan onze
          beslissing en laten je de uitkomst weten. Ook de melder informeren
          we over de uitkomst.
        </p>
        <p>
          <strong>Jouw klanten.</strong> De afspraken die je met jouw klanten
          maakt over verhuur, betaling, borg, schade en annulering zijn jouw
          eigen overeenkomsten; {COMPANY.brand} is daarin geen partij. Jij
          zorgt dat je klanten de wettelijk verplichte informatie krijgen. In
          het dashboard kun je daarvoor je eigen voorwaarden en
          privacyverklaring koppelen; die worden dan in de boekwidget en de
          footer van je klantsite getoond en je klant moet je voorwaarden
          aanvinken voordat hij boekt.
        </p>
      </Section>

      <Section title="8. Beschikbaarheid, onderhoud en klachten">
        <p>
          We streven naar een zo hoog mogelijke beschikbaarheid, maar geven
          geen gegarandeerd beschikbaarheidspercentage. Gepland onderhoud
          plannen we waar mogelijk buiten kantooruren en kondigen we aan in
          het dashboard of per e-mail. De actuele status van het platform
          zie je onderaan onze website.
        </p>
        <p>
          <strong>Storingen en klachten.</strong> Storingen meld je via een
          supportticket in het dashboard of via{" "}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>; kritische
          storingen pakken we zo snel mogelijk op, doorgaans binnen één
          werkdag. Heb je een klacht over onze dienst of over een factuur,
          mail die dan naar hetzelfde adres met een omschrijving en, als het
          om een factuur gaat, het factuurnummer. We bevestigen de ontvangst
          binnen twee werkdagen en reageren inhoudelijk binnen 14 dagen. Kom
          je er met onze medewerker niet uit, vraag dan om behandeling door
          een vennoot van {COMPANY.legalName}. Een klacht schort je
          betalingsverplichting niet op.
        </p>
      </Section>

      <HighlightSection title="9. Aansprakelijkheid">
        <p>
          We doen ons best om {COMPANY.brand} foutloos te laten draaien, maar
          software is nooit perfect. Daarom is het belangrijk dat dit
          duidelijk op papier staat:
        </p>
        <ul>
          <li>
            <strong>Geen aansprakelijkheid voor indirecte schade.</strong> Wij
            zijn niet aansprakelijk voor gederfde winst, gemiste boekingen,
            reputatieschade, dataverlies (anders dan herstel uit een geldige
            back-up), gevolgschade of schade aan derden, ook niet als een
            storing of fout aan onze kant ontstaat.
          </li>
          <li>
            <strong>Maximum bij directe schade.</strong> Mocht er toch sprake
            zijn van directe schade waarvoor wij wettelijk aansprakelijk zijn,
            dan is onze aansprakelijkheid beperkt tot het bedrag dat jij in de
            twaalf maanden voorafgaand aan het schadeveroorzakende feit aan
            ons hebt betaald.
          </li>
          <li>
            <strong>Overmacht.</strong> Wij zijn niet aansprakelijk voor schade
            door storingen bij onze leveranciers (hosting, e-mail,
            betaalproviders, Google), internetstoringen, cyberaanvallen,
            stroomuitval, natuurrampen of andere omstandigheden buiten onze
            redelijke controle.
          </li>
          <li>
            <strong>Jouw verantwoordelijkheid.</strong> Voor de inhoud van je
            klantsite en de overeenkomsten met jouw klanten (artikel 7) ben
            jij aansprakelijk; je vrijwaart ons voor aanspraken van derden
            die daaruit voortkomen.
          </li>
          <li>
            <strong>We pakken het samen op.</strong> Als er aan onze kant iets
            misgaat dat impact op jouw bedrijf heeft, kijken we altijd serieus
            mee en zoeken we samen naar een oplossing — ook waar geen
            wettelijke verplichting bestaat. Dat is geen erkenning van
            aansprakelijkheid.
          </li>
        </ul>
        <p>
          Deze beperkingen gelden niet bij opzet of bewuste roekeloosheid van
          ons of onze leidinggevenden, of waar de wet ze niet toestaat.
        </p>
      </HighlightSection>

      <Section title="10. Beveiliging en privacy">
        <p>
          We hosten in de EU (Hetzner, Duitsland), versleutelen verbindingen
          (TLS) en opgeslagen sleutels, en maken dagelijks een back-up van de
          database. Details over gegevensverwerking staan in onze{" "}
          <a href="/privacy">privacyverklaring</a> en in de{" "}
          <a href="/verwerkersovereenkomst">verwerkersovereenkomst</a>, die
          onderdeel is van deze voorwaarden.
        </p>
      </Section>

      <Section title="11. Wijzigingen, toepasselijk recht en geschillen">
        <p>
          We mogen deze voorwaarden aanpassen. Bij materiële wijzigingen
          informeren we je minimaal 30 dagen vooraf via e-mail of het
          dashboard. Ben je het er niet mee eens, dan kun je binnen die
          termijn opzeggen.
        </p>
        <p>
          Op deze voorwaarden is Nederlands recht van toepassing. Geschillen
          die we niet onderling kunnen oplossen leggen we voor aan{" "}
          {COMPANY.court}, tenzij de wet dwingend een andere rechter aanwijst.
        </p>
      </Section>
    </LegalPage>
  );
}
