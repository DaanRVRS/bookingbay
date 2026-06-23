-- Meerdere afbeeldingen per item (max 5 in de app). Eerste = hoofd-afbeelding
-- (= imageUrl). Bestaande items: kopieer de huidige imageUrl als eerste regel.
ALTER TABLE "Item" ADD COLUMN "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "Item"
SET "imageUrls" = ARRAY["imageUrl"]
WHERE "imageUrl" IS NOT NULL AND "imageUrl" <> '';
