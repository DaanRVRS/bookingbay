-- Schoonmaakkosten verhuizen van Organization (1 fee voor alle items)
-- naar Item (per-item fee). Klant kan zo onderscheid maken tussen items
-- die wel/niet schoonmaak vereisen (bv. boten wel, fietsen niet).

ALTER TABLE "Item"
  ADD COLUMN IF NOT EXISTS "cleaningFee" DECIMAL(10, 2);

ALTER TABLE "Organization"
  DROP COLUMN IF EXISTS "cleaningFeeEnabled",
  DROP COLUMN IF EXISTS "cleaningFeeCents";
