-- AlterTable
ALTER TABLE "Organization"
  ADD COLUMN "mollieCustomerId" TEXT,
  ADD COLUMN "mollieMandateId" TEXT,
  ADD COLUMN "currentPeriodEnd" TIMESTAMP(3),
  ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lastPaymentFailedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_mollieCustomerId_key" ON "Organization"("mollieCustomerId");

-- CreateTable
CREATE TABLE "PaymentEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "amountCents" INTEGER,
  "payload" JSONB,
  "subscriptionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_externalId_eventType_key" ON "PaymentEvent"("externalId", "eventType");

-- CreateIndex
CREATE INDEX "PaymentEvent_organizationId_createdAt_idx" ON "PaymentEvent"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentEvent_subscriptionId_idx" ON "PaymentEvent"("subscriptionId");

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
