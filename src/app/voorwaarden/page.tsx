import { LegalPage } from "@/components/marketing/LegalPage";

export const metadata = {
  title: "Algemene voorwaarden",
  description:
    "Algemene voorwaarden van BookingBay — de afspraken tussen jou en ons over het gebruik van onze software.",
};

export default function VoorwaardenPage() {
  return (
    <LegalPage title="Algemene voorwaarden" lastUpdated="7 mei 2026">
      <Section title="1. Wie zijn wij">
        <p>
          BookingBay is een Software-as-a-Service voor verhuurbedrijven. We
          worden geleverd door TMS Media, gevestigd in Nederland, ingeschreven
          bij de Kamer van Koophandel. Vragen kun je altijd sturen naar{" "}
          <a className="underline" href="mailto:hallo@bookingbay.nl">
            hallo@bookingbay.nl
          </a>
          .
        </p>
        <p>
          Deze voorwaarden gelden voor iedereen die een account aanmaakt of
          gebruik maakt van onze diensten ("klant", "jij"). Door je account aan
          te maken bevestig je dat je deze voorwaarden hebt gelezen en
          accepteert.
        </p>
      </Section>

      <Section title="2. Onze dienst">
        <p>
          Wij leveren toegang tot het BookingBay platform: dashboard, planning,
          boekingsbeheer, klantsite en bijbehorende functies zoals beschreven op
          onze website. We doen ons best om de dienst stabiel, veilig en up-to-date
          te houden, maar leveren de dienst "zoals beschikbaar".
        </p>
        <p>
          We mogen functies toevoegen, wijzigen of weghalen. Bij ingrijpende
          wijzigingen die jouw gebruik raken laten we het ruim van tevoren weten
          en zoeken we samen naar een passende oplossing.
        </p>
      </Section>

      <Section title="3. Account en gebruik">
        <p>
          Je bent zelf verantwoordelijk voor de gegevens die je in je account
          zet, voor de geheimhouding van je inloggegevens, en voor wat
          teamleden doen onder jullie organisatie.
        </p>
        <p>Je gebruikt BookingBay niet voor:</p>
        <ul>
          <li>activiteiten in strijd met de wet of de openbare orde;</li>
          <li>het verzenden van spam of misleidende communicatie;</li>
          <li>het reverse-engineeren of overbelasten van het platform;</li>
          <li>opslag van content waarvoor je geen rechten hebt.</li>
        </ul>
      </Section>

      <Section title="4. Tarieven en betaling">
        <p>
          Tarieven staan op{" "}
          <a className="underline" href="/#pricing">
            onze prijzenpagina
          </a>{" "}
          en zijn exclusief btw, tenzij anders vermeld. We mogen tarieven
          jaarlijks indexeren; we melden dat minimaal 30 dagen vooraf.
        </p>
        <p>
          <strong>Vooraf betalen.</strong> Je betaalt steeds vooraf voor de
          komende periode (maand of jaar). Pas na een succesvolle betaling
          wordt je abonnement (of de verlenging daarvan) actief.
        </p>
        <p>
          <strong>Wat gebeurt er als de betaling mislukt?</strong> Een paar
          dagen vóór de verlengdatum proberen we automatisch te incasseren. Als
          dat niet lukt, sturen we je een herinnering en proberen we het in de
          dagen daarna nog een aantal keer. Lukt het binnen ~7 dagen na de
          verlengdatum nog niet, dan stopt je abonnement automatisch. Je hoeft
          niets op te zeggen — geen betaling, geen abonnement.
        </p>
        <p>
          <strong>Weer beginnen.</strong> Wil je later weer terug? Inloggen,
          betaalmethode aanvullen en je oude data is gewoon weer beschikbaar.
          Je gegevens bewaren we tot 30 dagen na het einde van het abonnement
          en zijn in die periode te exporteren.
        </p>
      </Section>

      <Section title="5. Looptijd en opzegging">
        <p>
          Je abonnement loopt door totdat je opzegt. Maandabonnementen kun je op
          elk moment opzeggen tegen het einde van de lopende maand;
          jaarabonnementen tegen het einde van de lopende jaarperiode. Reeds
          betaalde periodes worden niet gerestitueerd, behalve waar de wet je
          dat recht geeft.
        </p>
        <p>
          Wij mogen je account beëindigen bij ernstige overtreding van deze
          voorwaarden, met voorafgaande kennisgeving waar dat redelijk is.
        </p>
      </Section>

      <Section title="6. Jouw data">
        <p>
          Alle data die jij in BookingBay zet (klanten, items, boekingen, eigen
          teksten en afbeeldingen) blijft van jou. Wij gebruiken die data
          alleen om de dienst aan jou te leveren, voor support, en voor
          geaggregeerde, niet-herleidbare productverbetering.
        </p>
        <p>
          Bij beëindiging kun je tot 30 dagen lang een export downloaden. Daarna
          verwijderen we je data uit de productieomgeving. Back-ups verlopen
          volgens onze back-up cyclus (max. 90 dagen).
        </p>
      </Section>

      <Section title="7. Beschikbaarheid en onderhoud">
        <p>
          We streven naar een uptime van 99,5% op maandbasis, gemeten over een
          rollend kwartaal. Geplande onderhoudsmomenten plannen we waar mogelijk
          buiten kantooruren en kondigen we aan in het dashboard of per e-mail.
        </p>
        <p>
          Storingen kun je melden via{" "}
          <a className="underline" href="mailto:hallo@bookingbay.nl">
            hallo@bookingbay.nl
          </a>
          . We pakken kritische storingen zo snel mogelijk op, doorgaans binnen
          één werkdag.
        </p>
      </Section>

      <HighlightSection title="8. Aansprakelijkheid">
        <p>
          We doen ons best om BookingBay foutloos te laten draaien, maar
          software is nooit perfect. Daarom is het belangrijk dat dit duidelijk
          op papier staat:
        </p>
        <ul>
          <li>
            <strong>Geen aansprakelijkheid voor indirecte schade.</strong> Wij
            zijn niet aansprakelijk voor gederfde winst, gemiste boekingen,
            reputatieschade, dataverlies (anders dan herstel uit een geldige
            back-up), gevolgschade of schade aan derden, ook niet als een storing
            of fout aan onze kant ontstaat.
          </li>
          <li>
            <strong>Maximum bij directe schade.</strong> Mocht er toch sprake
            zijn van directe schade waarvoor wij wettelijk aansprakelijk zijn,
            dan is onze aansprakelijkheid beperkt tot het bedrag dat jij in de
            twaalf maanden voorafgaand aan het schadeveroorzakende feit aan
            BookingBay hebt betaald.
          </li>
          <li>
            <strong>Overmacht.</strong> Wij zijn niet aansprakelijk voor schade
            door storingen bij onze leveranciers (hosting, e-mail, betalings­providers),
            internetstoringen, cyberaanvallen, stroomuitval, natuurrampen of
            andere omstandigheden buiten onze redelijke controle.
          </li>
          <li>
            <strong>Jouw verantwoordelijkheid.</strong> De afspraken die je met
            jouw klanten maakt — over verhuur, betaling, schade aan goederen,
            annuleringen — zijn jouw eigen contracten. BookingBay is daarin
            alleen het registratiesysteem; we zijn geen partij in jouw
            verhuurovereenkomsten.
          </li>
          <li>
            <strong>We pakken het samen op.</strong> Als er aan onze kant iets
            misgaat dat impact op jouw bedrijf heeft, kijken we altijd serieus
            mee en zoeken samen naar een oplossing — zelfs waar geen wettelijke
            verplichting bestaat. Maar dat is geen erkenning van
            aansprakelijkheid.
          </li>
        </ul>
        <p>
          Deze beperkingen gelden niet bij opzet of bewuste roekeloosheid van
          ons of onze leidinggevenden, of waar de wet ze niet toestaat.
        </p>
      </HighlightSection>

      <Section title="9. Beveiliging en privacy">
        <p>
          We hosten in de EU (Hetzner, Duitsland), versleutelen data in transit
          en gebruiken dagelijkse encrypted back-ups. Verdere details over
          gegevensverwerking lees je in onze{" "}
          <a className="underline" href="/privacy">
            privacyverklaring
          </a>{" "}
          en{" "}
          <a className="underline" href="/verwerkersovereenkomst">
            verwerkersovereenkomst
          </a>
          .
        </p>
      </Section>

      <Section title="10. Wijzigingen in deze voorwaarden">
        <p>
          We mogen deze voorwaarden aanpassen. Bij materiële wijzigingen
          informeren we je minimaal 30 dagen vooraf via e-mail of het
          dashboard. Ben je het er niet mee eens, dan kun je binnen die termijn
          opzeggen.
        </p>
      </Section>

      <Section title="11. Toepasselijk recht">
        <p>
          Op deze voorwaarden is Nederlands recht van toepassing. Geschillen die
          we niet onderling kunnen oplossen leggen we voor aan de bevoegde
          rechter in het arrondissement waar TMS Media gevestigd is.
        </p>
      </Section>
    </LegalPage>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground [&_strong]:text-foreground [&_a]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul>li]:my-1">
        {children}
      </div>
    </section>
  );
}

function HighlightSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 rounded-2xl border border-border bg-accent/30 p-6">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground [&_strong]:text-foreground [&_a]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul>li]:my-1">
        {children}
      </div>
    </section>
  );
}
