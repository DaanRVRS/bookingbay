-- Add-ons: een item kan als optionele extra (zwemvest, koelbox, schipper)
-- bij een gewone boeking gekozen worden. isAddon-items zijn niet zelfstandig
-- boekbaar; addonPrice = vaste prijs per stuk.
ALTER TABLE "Item"
  ADD COLUMN IF NOT EXISTS "isAddon" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "addonPrice" DECIMAL(10, 2);

-- Gekozen add-ons per boeking, als snapshot-JSON:
--   [{ "itemId": "...", "name": "...", "unitPrice": 5, "quantity": 2 }]
ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "addons" JSONB;
