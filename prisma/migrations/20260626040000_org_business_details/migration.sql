-- Bedrijfsgegevens voor de klantsite-footer: adres, KvK- en BTW-nummer.
ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "businessAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "businessPostcode" TEXT,
  ADD COLUMN IF NOT EXISTS "businessCity" TEXT,
  ADD COLUMN IF NOT EXISTS "kvkNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "vatNumber" TEXT;
