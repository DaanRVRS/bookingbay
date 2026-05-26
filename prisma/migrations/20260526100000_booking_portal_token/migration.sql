-- Klant-portaal stapt over van magic-link-login naar pre-authenticated
-- links: bij elke booking wordt een random token gegenereerd en
-- meegestuurd in de bevestigingsmail (en in de 24u-reminder). De klant
-- klikt en is meteen op zijn boeking-pagina — geen login meer.
--
-- CustomerPortalToken-tabel is daarmee overbodig.

ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "portalToken" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Booking_portalToken_key"
  ON "Booking"("portalToken");

DROP TABLE IF EXISTS "CustomerPortalToken";
