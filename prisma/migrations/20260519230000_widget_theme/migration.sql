-- Widget: vrije kleur-thema-overrides (object van optionele hex-kleuren).
ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "widgetTheme" JSONB NOT NULL DEFAULT '{}';
