-- Trial-end reminders worden bijgehouden via een aparte stage-kolom zodat
-- de bestaande paymentReminderStage z'n eigen state houdt.
ALTER TABLE "Organization"
  ADD COLUMN "trialReminderStage" INTEGER NOT NULL DEFAULT 0;
