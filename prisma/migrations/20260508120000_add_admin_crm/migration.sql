-- Platform-CRM: track interactions + follow-up reminders + customer pipeline
-- status. Only used by BookingBay admins.

ALTER TABLE "Organization"
  ADD COLUMN "crmStatus" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN "crmTags" JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX "Organization_crmStatus_idx" ON "Organization"("crmStatus");

CREATE TABLE "OrgInteraction" (
  "id"             TEXT          PRIMARY KEY,
  "organizationId" TEXT          NOT NULL,
  "actorUserId"    TEXT,
  "type"           TEXT          NOT NULL,
  "subject"        TEXT          NOT NULL,
  "body"           TEXT,
  "occurredAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3)  NOT NULL,

  CONSTRAINT "OrgInteraction_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT "OrgInteraction_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "OrgInteraction_organizationId_occurredAt_idx"
  ON "OrgInteraction"("organizationId", "occurredAt");

CREATE TABLE "OrgReminder" (
  "id"               TEXT          PRIMARY KEY,
  "organizationId"   TEXT          NOT NULL,
  "createdById"      TEXT,
  "assignedToUserId" TEXT,
  "title"            TEXT          NOT NULL,
  "notes"            TEXT,
  "dueAt"            TIMESTAMP(3)  NOT NULL,
  "completedAt"      TIMESTAMP(3),
  "notifiedAt"       TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3)  NOT NULL,

  CONSTRAINT "OrgReminder_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT "OrgReminder_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT "OrgReminder_assignedToUserId_fkey"
    FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "OrgReminder_completedAt_dueAt_idx"
  ON "OrgReminder"("completedAt", "dueAt");

CREATE INDEX "OrgReminder_organizationId_completedAt_idx"
  ON "OrgReminder"("organizationId", "completedAt");

CREATE INDEX "OrgReminder_assignedToUserId_completedAt_idx"
  ON "OrgReminder"("assignedToUserId", "completedAt");
