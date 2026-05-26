-- Klant-portaal magic-link tokens. Eén rij per uitgegeven login-link.
-- Token = random 32-byte hex, eenmalig bruikbaar (usedAt vult), expires
-- na ~15 minuten. Cron-cleanup gebruiken we niet — oude rows blijven
-- als audit-trail staan, ze zijn klein.
CREATE TABLE IF NOT EXISTS "CustomerPortalToken" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "email"          TEXT NOT NULL,
  "token"          TEXT NOT NULL,
  "expiresAt"      TIMESTAMP(3) NOT NULL,
  "usedAt"         TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerPortalToken_token_key"
  ON "CustomerPortalToken"("token");

CREATE INDEX IF NOT EXISTS "CustomerPortalToken_organizationId_email_idx"
  ON "CustomerPortalToken"("organizationId", "email");
