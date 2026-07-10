-- Fee-snapshot op de boeking, zodat exports de prijsopbouw tonen zoals
-- betaald — ook als de eigenaar de item-fees later wijzigt. Nullable: oude
-- boekingen vallen terug op de live item-fees.
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "feeSnapshot" JSONB;
