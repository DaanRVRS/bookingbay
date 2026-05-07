-- Per-user notifications, fan-out from admin broadcasts.
CREATE TABLE "Notification" (
  "id"             TEXT          PRIMARY KEY,
  "userId"         TEXT          NOT NULL,
  "organizationId" TEXT,
  "type"           TEXT          NOT NULL DEFAULT 'broadcast',
  "title"          TEXT          NOT NULL,
  "body"           TEXT          NOT NULL,
  "ctaUrl"         TEXT,
  "ctaLabel"       TEXT,
  "createdById"    TEXT,
  "readAt"         TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Notification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT "Notification_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT "Notification_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Notification_userId_readAt_createdAt_idx"
  ON "Notification"("userId", "readAt", "createdAt");

CREATE INDEX "Notification_userId_createdAt_idx"
  ON "Notification"("userId", "createdAt");
