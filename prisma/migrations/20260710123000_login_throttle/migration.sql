-- Brute-force-throttle voor login + 2FA-verificatie.
CREATE TABLE IF NOT EXISTS "LoginThrottle" (
  "id"          TEXT NOT NULL,
  "key"         TEXT NOT NULL,
  "count"       INTEGER NOT NULL DEFAULT 0,
  "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedUntil" TIMESTAMP(3),
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LoginThrottle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LoginThrottle_key_key" ON "LoginThrottle" ("key");
