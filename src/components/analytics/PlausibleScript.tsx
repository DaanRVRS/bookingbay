import Script from "next/script";

/**
 * Plausible Analytics — self-hosted door Fourwrd op stats.fourwrd.nl
 * (Hetzner, EU), cookieloos, geen individuele profielen.
 *
 * Bewust alléén op de eigen marketingsite, de inlogpagina's en het
 * dashboard/admin. NIET op klantsites, de boekpagina (/book), het klant-
 * portaal en de embed-iframes: daar zijn de bezoekers klanten van de
 * verhuurder en meten wij niets voor onszelf. Zie de privacyverklaring.
 */
export function PlausibleScript() {
  return (
    <>
      <Script
        defer
        data-domain="bookingbay.nl"
        src="https://stats.fourwrd.nl/js/script.file-downloads.outbound-links.tagged-events.js"
        strategy="afterInteractive"
      />
      <Script id="plausible-queue" strategy="afterInteractive">
        {"window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }"}
      </Script>
    </>
  );
}
