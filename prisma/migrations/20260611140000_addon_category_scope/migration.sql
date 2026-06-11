-- Add-ons beperken tot specifieke categorieën. Array van category-ids;
-- NULL/leeg = add-on geldt bij alle categorieën.
ALTER TABLE "Item"
  ADD COLUMN IF NOT EXISTS "addonCategoryIds" JSONB;
