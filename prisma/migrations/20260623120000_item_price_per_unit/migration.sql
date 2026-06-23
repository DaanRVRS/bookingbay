-- Eén prijs per verhuur-eenheid i.p.v. losse uur/dag/week-tarieven.
-- De eenheid = Item.bookingIntervalMinutes (per uur/dag/week/15 min) en het
-- totaal = ceil(duur / interval) × pricePerUnit.
--
-- Bewuste keuze: bestaande tarieven worden NIET gemigreerd — prijzen worden
-- onder het nieuwe model opnieuw ingevuld (pricePerUnit start leeg/NULL).
-- Bestaande boekingen bewaren hun reeds berekende totalPrice (snapshot), dus
-- het droppen van de oude kolommen raakt historische bedragen niet.
ALTER TABLE "Item" ADD COLUMN "pricePerUnit" DECIMAL(10,2);

ALTER TABLE "Item" DROP COLUMN "pricePerHour";
ALTER TABLE "Item" DROP COLUMN "pricePerDay";
ALTER TABLE "Item" DROP COLUMN "pricePerWeek";
