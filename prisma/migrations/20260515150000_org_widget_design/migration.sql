-- Widget design lives server-side achter de publicEmbedKey
ALTER TABLE "Organization"
  ADD COLUMN "widgetAccent" TEXT,
  ADD COLUMN "widgetWidth" TEXT NOT NULL DEFAULT '600',
  ADD COLUMN "widgetRadius" INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN "widgetShadow" BOOLEAN NOT NULL DEFAULT true;
