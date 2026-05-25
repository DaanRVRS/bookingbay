-- Auto review-uitvraag: na X dagen voltooid gaat een mail uit naar de
-- klant met een link naar de tenant's reviewRequestUrl.
ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "reviewRequestEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "reviewRequestUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewRequestDelayDays" INTEGER NOT NULL DEFAULT 3;

-- Klant-portaal: per-org toggle + annulerings-window (uren v\xF3\xF3r startAt
-- waarbinnen de klant zelf nog mag annuleren).
ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "customerPortalEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "customerPortalCancelHoursMin" INTEGER NOT NULL DEFAULT 24;

-- Anti-dupe voor de review-uitvraag-mail.
ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "reviewRequestedAt" TIMESTAMP(3);
