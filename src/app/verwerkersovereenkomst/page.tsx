import { LegalPage } from "@/components/marketing/LegalPage";

export const metadata = {
  title: "Verwerkersovereenkomst",
  description:
    "Verwerkersovereenkomst (DPA) tussen BookingBay en klanten — afspraken over verwerking van persoonsgegevens.",
};

export default function DpaPage() {
  return (
    <LegalPage title="Verwerkersovereenkomst" lastUpdated="7 mei 2026">
      <Section title="Inleiding">
        <p>
          Deze verwerkersovereenkomst (DPA) is van toepassing wanneer jij als
          klant ("verwerkings­verantwoordelijke") gebruik maakt van BookingBay
          en daarbij persoonsgegevens van je eindgebruikers verwerkt. BookingBay
          treedt daarbij op als verwerker.
        </p>
        <p>
          Door je BookingBay-account te activeren ga je akkoord met deze DPA;
          een aparte ondertekening is niet nodig, maar op verzoek leveren we een
          PDF-versie met handtekening op.
        </p>
      </Section>

      <Section title="Wat verwerken we">
        <p>
          We verwerken namens jou de gegevens die jij of je teamleden invoeren
          in BookingBay, onder meer: namen, contactgegevens en boekingshistorie
          van jouw klanten en leads.
        </p>
      </Section>

      <Section title="Doeleinden">
        <ul>
          <li>Het leveren van het BookingBay platform aan jou.</li>
          <li>Het bieden van support op jouw verzoek.</li>
          <li>Beveiliging, monitoring en fraudepreventie.</li>
          <li>Geaggregeerde, niet-herleidbare productanalyse.</li>
        </ul>
      </Section>

      <Section title="Beveiliging">
        <p>
          Wij nemen passende technische en organisatorische maatregelen, onder
          andere: hosting in de EU (Hetzner), versleuteling in transit (TLS),
          versleutelde back-ups, role-based access control, audit logging,
          minimaal-privilege toegang voor onze medewerkers en periodieke
          security reviews.
        </p>
      </Section>

      <Section title="Subverwerkers">
        <p>
          Wij maken gebruik van een beperkt aantal subverwerkers. De huidige
          lijst:
        </p>
        <ul>
          <li>Hetzner Online GmbH (Duitsland) — hosting en database.</li>
          <li>Zoho Mail (EU) — transactionele e-mail.</li>
          <li>Stripe (EU/VS) — betalingsverwerking voor abonnementen.</li>
        </ul>
        <p>
          Bij wijzigingen van subverwerkers informeren we je vooraf zodat je
          desgewenst bezwaar kunt maken.
        </p>
      </Section>

      <Section title="Datalekken">
        <p>
          Bij een (vermoeden van een) datalek informeren we je zonder onnodige
          vertraging, in ieder geval binnen 48 uur na ontdekking. We helpen je
          om eventuele meldplichten richting de AP en betrokkenen na te komen.
        </p>
      </Section>

      <Section title="Rechten van betrokkenen">
        <p>
          Wij ondersteunen je bij verzoeken van eindgebruikers (inzage,
          verwijdering, dataportabiliteit) door de juiste exports en
          verwijderingen aan jouw kant mogelijk te maken.
        </p>
      </Section>

      <Section title="Beëindiging">
        <p>
          Bij beëindiging van het abonnement verwijderen we de door jou
          ingevoerde data binnen 30 dagen uit de productieomgeving. Eerder
          gemaakte back-ups worden volgens de back-up cyclus (max. 90 dagen)
          opgeruimd, tenzij wettelijk anders vereist.
        </p>
      </Section>

      <Section title="Aansprakelijkheid">
        <p>
          Voor aansprakelijkheid in het kader van deze verwerking gelden de
          afspraken zoals vastgelegd in onze{" "}
          <a className="underline" href="/voorwaarden">
            algemene voorwaarden
          </a>
          .
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Vragen over deze DPA?{" "}
          <a className="underline" href="mailto:privacy@bookingbay.nl">
            privacy@bookingbay.nl
          </a>
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
