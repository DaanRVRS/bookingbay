-- Schoonmaakkosten — vaste flat fee per boeking. Cents (Int) i.p.v.
-- Decimal: geen fractie nodig, geen floating-point precisie-risico.
ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "cleaningFeeEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "cleaningFeeCents" INTEGER NOT NULL DEFAULT 0;
