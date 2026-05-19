-- Widget: USP-bullets, optionele tagline en standaardtaal.
ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "widgetUsps" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "widgetTagline" TEXT,
  ADD COLUMN IF NOT EXISTS "widgetDefaultLocale" TEXT NOT NULL DEFAULT 'nl';
