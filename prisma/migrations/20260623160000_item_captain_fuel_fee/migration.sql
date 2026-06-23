-- Extra optionele vaste fees per item, naast de schoonmaak-fee: kapitein en
-- brandstof. Null/0 = uit; >0 = bedrag wordt bovenop het tijd-tarief opgeteld.
ALTER TABLE "Item" ADD COLUMN "captainFee" DECIMAL(10,2);
ALTER TABLE "Item" ADD COLUMN "fuelFee" DECIMAL(10,2);
