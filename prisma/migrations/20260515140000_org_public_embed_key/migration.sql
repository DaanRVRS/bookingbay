-- Add column
ALTER TABLE "Organization" ADD COLUMN "publicEmbedKey" TEXT;

-- Backfill existing rows met een random pk_ key. PostgreSQL pgcrypto
-- (gen_random_uuid) zit in elke recente Postgres standaard mee — fallback
-- naar md5(random) voor oudere installs.
UPDATE "Organization"
SET "publicEmbedKey" = 'pk_' || replace(gen_random_uuid()::text, '-', '')
WHERE "publicEmbedKey" IS NULL;

-- Unique index
CREATE UNIQUE INDEX "Organization_publicEmbedKey_key" ON "Organization"("publicEmbedKey");
