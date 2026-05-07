-- Billing lifecycle: track paid-through date, reminder stage, and auto-suspension.
ALTER TABLE "Organization"
  ADD COLUMN "paidUntil" TIMESTAMP(3),
  ADD COLUMN "paymentReminderStage" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "suspendedAt" TIMESTAMP(3);

-- Index used by the daily cron job to locate orgs nearing or past expiry.
CREATE INDEX "Organization_paidUntil_idx" ON "Organization"("paidUntil");
