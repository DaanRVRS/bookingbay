import { LegalPage, Section } from "@/components/marketing/LegalPage";
import { COMPANY } from "@/lib/company";

export const metadata = {
  title: "Toegankelijkheid",
  description:
    "Hoe BookingBay werkt aan toegankelijkheid van de website, het dashboard en de boekwidget, en hoe je problemen meldt.",
};

export default function ToegankelijkheidPage() {
  return (
    <LegalPage title="Toegankelijkheidsverklaring" lastUpdated={COMPANY.legalUpdated}>
      <Section title="Waar dit over gaat">
        <p>
          {COMPANY.legalName} wil dat de website van {COMPANY.brand}, het
          dashboard voor verhuurders en de onderdelen die verhuurders aan hun
          klanten tonen (klantsite, boekwidget, klantportaal) bruikbaar zijn
          voor iedereen, ook met een toetsenbord, schermlezer of vergroting.
          We werken daarbij met de richtlijnen WCAG 2.1 niveau AA als
          uitgangspunt. Deze verklaring beschrijft wat we doen en wat nog
          niet af is; het is geen conformiteitsverklaring.
        </p>
      </Section>

      <Section title="Wat we hebben gedaan">
        <ul>
          <li>
            Kleurcontrast: de oranje huisstijlkleur is donkerder gemaakt zodat
            witte tekst op knoppen en oranje labels op de achtergrond
            minimaal 4,5:1 halen. Op klantsites en in de widget wordt de
            tekstkleur op de accentkleur van de verhuurder automatisch
            donker gemaakt als wit onvoldoende contrast geeft.
          </li>
          <li>
            Toetsenbord: alle knoppen en links zijn met Tab bereikbaar, hebben
            een zichtbare focusrand en er staat bovenaan elke pagina een
            &ldquo;Direct naar inhoud&rdquo;-link.
          </li>
          <li>
            Formulieren: velden hebben een gekoppeld label, foutmeldingen
            worden aan het veld gekoppeld en niet alleen via kleur getoond.
          </li>
          <li>
            Uitklapbare onderdelen (zoals de veelgestelde vragen) melden aan
            hulptechnologie of ze open of dicht staan.
          </li>
          <li>
            De boekwidget geeft de gekozen taal door aan de browser en
            hulptechnologie, zodat teksten in de juiste taal worden
            voorgelezen.
          </li>
          <li>
            Afbeeldingen van verhuur-items hebben een tekstalternatief;
            decoratieve afbeeldingen zijn voor schermlezers verborgen.
          </li>
        </ul>
      </Section>

      <Section title="Wat nog niet af is">
        <ul>
          <li>
            We hebben nog geen volledige controle met schermlezers op alle
            schermen uitgevoerd. Vooral de planning (sleepbare boekingen) en
            de page-builder in het dashboard zijn met een muis gebouwd en
            nog niet volledig met alleen het toetsenbord te bedienen.
          </li>
          <li>
            Verhuurders vullen zelf de inhoud van hun klantsite (teksten,
            foto&apos;s, kleuren). Wij bieden de bouwstenen en automatische
            contrastcorrectie, maar kunnen niet garanderen dat elke klantsite
            aan alle richtlijnen voldoet.
          </li>
          <li>
            Het klantportaal en de bevestigings- en herinneringsmails zijn
            alleen in het Nederlands beschikbaar; de boekwidget is in tien
            talen beschikbaar.
          </li>
        </ul>
      </Section>

      <Section title="Problemen melden">
        <p>
          Loop je ergens tegenaan? Mail{" "}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> met de
          pagina, wat je probeerde te doen en welke hulpmiddelen je gebruikt.
          We reageren doorgaans binnen vijf werkdagen en zoeken een oplossing
          of een alternatieve manier om hetzelfde te bereiken.
        </p>
      </Section>
    </LegalPage>
  );
}
