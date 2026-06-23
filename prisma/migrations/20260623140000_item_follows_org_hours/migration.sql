-- Eén "Reserveer-tijden"-component: een item volgt standaard de organisatie-
-- openingstijden, of houdt een eigen tijdvenster aan. De losse per-item
-- openingstijden-override (businessHoursOverride) vervalt.
--
-- Bestaande items krijgen followsOrgHours = false zodat hun huidige venster
-- (bookingWindowStartMin..EndMin) precies blijft werken zoals nu — geen
-- gedragsverandering. Nieuwe items volgen standaard de org-tijden (DEFAULT
-- hieronder op true gezet ná het invullen van de bestaande rijen).
ALTER TABLE "Item" ADD COLUMN "followsOrgHours" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Item" ALTER COLUMN "followsOrgHours" SET DEFAULT true;

ALTER TABLE "Item" DROP COLUMN "businessHoursOverride";
