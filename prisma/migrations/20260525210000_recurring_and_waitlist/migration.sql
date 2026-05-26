-- RecurringBooking: template voor abonnement-achtige reeksen. De
-- booking-pulse cron materialiseert Booking-rows op basis van
-- nextRunAt; na elke materialisatie schuiven we nextRunAt door.

CREATE TYPE "RecurringFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY');

CREATE TABLE IF NOT EXISTS "RecurringBooking" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "itemId"         TEXT NOT NULL REFERENCES "Item"("id") ON DELETE CASCADE,
  "customerId"     TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE,
  "frequency"      "RecurringFrequency" NOT NULL,
  "dayOfWeek"      INTEGER,
  "dayOfMonth"     INTEGER,
  "startTimeMin"   INTEGER NOT NULL,
  "endTimeMin"     INTEGER NOT NULL,
  "nextRunAt"      TIMESTAMP(3) NOT NULL,
  "endsAt"         TIMESTAMP(3),
  "isActive"       BOOLEAN NOT NULL DEFAULT true,
  "notes"          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "RecurringBooking_organizationId_isActive_idx"
  ON "RecurringBooking"("organizationId", "isActive");

CREATE INDEX IF NOT EXISTS "RecurringBooking_nextRunAt_isActive_idx"
  ON "RecurringBooking"("nextRunAt", "isActive");

-- Waitlist: klanten die op de wachtlijst staan voor een datum/item.
-- Cancel-hook checkt deze tabel bij elke geannuleerde boeking en mailt
-- de eerstvolgende kandidaat.

CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'NOTIFIED', 'CONVERTED', 'EXPIRED');

CREATE TABLE IF NOT EXISTS "WaitlistEntry" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "itemId"         TEXT NOT NULL REFERENCES "Item"("id") ON DELETE CASCADE,
  "customerId"     TEXT REFERENCES "Customer"("id") ON DELETE SET NULL,
  "customerName"   TEXT NOT NULL,
  "customerEmail"  TEXT NOT NULL,
  "customerPhone"  TEXT,
  "desiredStartAt" TIMESTAMP(3) NOT NULL,
  "desiredEndAt"   TIMESTAMP(3) NOT NULL,
  "notes"          TEXT,
  "status"         "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
  "notifiedAt"     TIMESTAMP(3),
  "expiresAt"      TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "WaitlistEntry_organizationId_status_idx"
  ON "WaitlistEntry"("organizationId", "status");

CREATE INDEX IF NOT EXISTS "WaitlistEntry_itemId_desiredStartAt_idx"
  ON "WaitlistEntry"("itemId", "desiredStartAt");
