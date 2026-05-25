-- Anti-dupe vlag voor de booking-pulse cron: gezet zodra de klant z'n
-- 24u-vóór-startAt reminder per mail heeft gekregen. Zonder dit veld
-- zouden cron-retries dezelfde klant meerdere mails sturen.
ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "customerReminderSentAt" TIMESTAMP(3);
