-- Organization: tenant payment configuration
ALTER TABLE "Organization"
  ADD COLUMN "paymentProvider" TEXT NOT NULL DEFAULT 'LOCATION',
  ADD COLUMN "paymentMollieKeyEnc" TEXT,
  ADD COLUMN "paymentStripeKeyEnc" TEXT,
  ADD COLUMN "paymentStripeWebhookSecretEnc" TEXT;

-- Booking: per-booking online payment state
ALTER TABLE "Booking"
  ADD COLUMN "paymentStatus" TEXT,
  ADD COLUMN "paymentProvider" TEXT,
  ADD COLUMN "paymentRef" TEXT;

-- Unique index op paymentRef zodat webhooks de juiste boeking vinden zonder
-- collisions over alle providers heen.
CREATE UNIQUE INDEX "Booking_paymentRef_key" ON "Booking"("paymentRef");
