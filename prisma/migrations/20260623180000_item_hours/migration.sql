-- Eigen per-weekdag openingstijden voor een item (custom tijden per dag i.p.v.
-- één vast venster). Alleen gebruikt als followsOrgHours = false; null = val
-- terug op bookingWindowStartMin..EndMin. Zelfde JSON-shape als
-- Organization.businessHours (7-daags ma..zo {open, close, closed}).
ALTER TABLE "Item" ADD COLUMN "itemHours" JSONB;
