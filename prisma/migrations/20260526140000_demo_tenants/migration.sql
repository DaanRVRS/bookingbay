-- Demo-tenants: aangemaakt door /demo voor prospects om het dashboard
-- zonder signup uit te proberen. Cleanup-cron wist orgs ouder dan 7
-- dagen + cascade naar memberships/users/items/bookings.
ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- Composite index voor de cleanup-query (isDemo=true AND createdAt < cutoff).
CREATE INDEX IF NOT EXISTS "Organization_isDemo_createdAt_idx"
  ON "Organization"("isDemo", "createdAt");
