-- Split betaalconfig: "op locatie" en "online" staan los van elkaar.
ALTER TABLE "Organization"
  ADD COLUMN "acceptLocationPayment" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "onlinePaymentProvider" TEXT;

-- Backfill vanuit de oude single-choice kolom:
--  - MOLLIE/STRIPE → online provider gezet, locatie blijft ook aan (default true)
--  - LOCATION/overig → alleen locatie
UPDATE "Organization"
SET "onlinePaymentProvider" = 'MOLLIE'
WHERE "paymentProvider" = 'MOLLIE';

UPDATE "Organization"
SET "onlinePaymentProvider" = 'STRIPE'
WHERE "paymentProvider" = 'STRIPE';
