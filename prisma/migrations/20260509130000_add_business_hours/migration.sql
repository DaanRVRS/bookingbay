-- Voeg openingstijden toe op org-niveau (standaard) en optionele override per item.
ALTER TABLE "Organization"
  ADD COLUMN "businessHours" JSONB;

ALTER TABLE "Item"
  ADD COLUMN "businessHoursOverride" JSONB;
