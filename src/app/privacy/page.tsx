import { LegalPage } from "@/components/marketing/LegalPage";

export const metadata = {
  title: "Privacyverklaring",
  description:
    "Hoe BookingBay omgaat met persoonsgegevens van klanten en hun eindgebruikers.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacyverklaring" lastUpdated="7 mei 2026">
      <Section title="In het kort">
        <p>
          Wij verwerken zo min mogelijk persoonsgegevens en doen dat alleen om
          BookingBay aan jou te leveren. We verkopen geen data, hosten in de EU
          en je houdt op elk moment controle over je eigen gegevens.
        </p>
      </Section>

      <Section title="Wie is verantwoordelijk">
        <p>
          BookingBay wordt geleverd door TMS Media, gevestigd in Nederland. Voor
          gegevens die jíj als klant via BookingBay verwerkt over je eigen
          klanten of leads, ben jij verwerkings­verantwoordelijke en zijn wij
          verwerker. Hiervoor sluiten we een{" "}
          <a className="underline" href="/verwerkersovereenkomst">
            verwerkersovereenkomst
          </a>
          .
        </p>
      </Section>

      <Section title="Welke gegevens verwerken wij van jou (de klant)">
        <ul>
          <li>Account: naam, e-mailadres, organisatienaam, wachtwoord (gehasht).</li>
          <li>Facturatie: bedrijfsgegevens, factuuradres, betalingsgegevens via onze betaalprovider.</li>
          <li>Gebruik: logbestanden, IP-adres, apparaat-info, audit log van handelingen.</li>
          <li>Communicatie: e-mails en berichten die je naar support stuurt.</li>
        </ul>
      </Section>

      <Section title="Welke gegevens verwerken wij namens jou">
        <p>
          Alles wat jij in BookingBay invoert: items, klantgegevens van je
          eigen huurders, boekingen, facturen, foto's en eigen content. Wij
          gebruiken die gegevens uitsluitend om de dienst aan jou te leveren.
        </p>
      </Section>

      <Section title="Doeleinden en grondslagen">
        <ul>
          <li>
            <strong>Uitvoering van de overeenkomst</strong> — om je toegang te
            geven tot het platform, ondersteuning te bieden en facturen te sturen.
          </li>
          <li>
            <strong>Wettelijke verplichting</strong> — fiscale bewaarplicht voor
            facturen en boekhouding.
          </li>
          <li>
            <strong>Gerechtvaardigd belang</strong> — beveiliging, fraudepreventie,
            anonieme productverbetering.
          </li>
        </ul>
      </Section>

      <Section title="Hosting en doorgifte">
        <p>
          Onze servers staan bij Hetzner in Duitsland. We verwerken
          persoonsgegevens in beginsel binnen de Europese Economische Ruimte.
          Voor enkele subverwerkers (e-mail, foutdetectie) kan
          gegevensverwerking buiten de EU plaatsvinden; daar gebruiken we de
          standaard­contract­bepalingen van de Europese Commissie.
        </p>
      </Section>

      <Section title="Bewaartermijnen">
        <ul>
          <li>Account- en factureringsdata: tot 7 jaar na einde abonnement (fiscaal).</li>
          <li>Door jou ingevoerde data: zolang je account actief is, daarna nog 30 dagen voor export.</li>
          <li>Audit logs: 24 maanden.</li>
          <li>Back-ups: tot 90 dagen.</li>
        </ul>
      </Section>

      <Section title="Jouw rechten">
        <p>
          Je hebt recht op inzage, correctie, verwijdering, beperking, bezwaar
          en dataportabiliteit. Je kunt dat aanvragen via{" "}
          <a className="underline" href="mailto:privacy@bookingbay.nl">
            privacy@bookingbay.nl
          </a>
          . Niet tevreden over de afhandeling? Dan kun je een klacht indienen bij
          de Autoriteit Persoonsgegevens.
        </p>
      </Section>

      <Section title="Cookies en analytics">
        <p>
          We gebruiken alleen functionele cookies voor login en sessie. Voor
          marketingstatistieken gebruiken we een privacyvriendelijke,
          cookieloze tool die geen profielen opbouwt.
        </p>
      </Section>

      <Section title="Wijzigingen">
        <p>
          We kunnen deze verklaring aanpassen. De huidige versie is altijd
          beschikbaar op deze pagina. Bij belangrijke wijzigingen lichten we je
          actief in.
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
