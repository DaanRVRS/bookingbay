-- Add column
ALTER TABLE "Organization" ADD COLUMN "publicEmbedKey" TEXT;

-- Backfill existing rows met een random pk_ key. md5(random()) werkt op
-- ELKE Postgres-versie zonder extensies (anders dan gen_random_uuid dat
-- pgcrypto / PG13+ vereist).
UPDATE "Organization"
SET "publicEmbedKey" =
  'pk_' || md5(random()::text || clock_timestamp()::text || "id")
WHERE "publicEmbedKey" IS NULL;

-- Unique index
CREATE UNIQUE INDEX "Organization_publicEmbedKey_key" ON "Organization"("publicEmbedKey");
