-- Velden voor handmatige afronding: status COMPLETED wordt nu door de
-- eigenaar gezet (niet meer auto op endAt), met optioneel schade-vlag,
-- opmerkingen en het moment van afronden.
ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "completionDamage" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "completionNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
