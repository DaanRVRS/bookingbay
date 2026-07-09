-- Kleuren per site-onderdeel (header/footer/pagina-achtergrond) voor de
-- klantensite. Null = standaard thema.
ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "siteTheme" JSONB;
