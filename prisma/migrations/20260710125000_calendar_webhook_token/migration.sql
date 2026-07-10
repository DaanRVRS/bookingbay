-- Channel-token voor Google-Calendar push-webhooks. Google echoot 'm terug in
-- X-Goog-Channel-Token; de webhook verifieert 'm zodat een uitgelekte
-- channelId niet volstaat. Null = legacy watch, geverifieerd bij renew.
ALTER TABLE "CalendarSyncState" ADD COLUMN IF NOT EXISTS "webhookToken" TEXT;
