-- Sales-CRM: prospects + interactions + reminders die NOG GEEN organisatie
-- hebben. Wordt gekoppeld aan een Organization zodra de prospect zich
-- registreert (status → "gewonnen").

CREATE TABLE "AdminProspect" (
  "id"             TEXT          PRIMARY KEY,
  "status"         TEXT          NOT NULL DEFAULT 'lead',
  "name"           TEXT          NOT NULL,
  "companyName"    TEXT,
  "email"          TEXT,
  "phone"          TEXT,
  "source"         TEXT,
  "notes"          TEXT,
  "tags"           JSONB         NOT NULL DEFAULT '[]'::jsonb,
  "createdById"    TEXT,
  "ownerUserId"    TEXT,
  "convertedOrgId" TEXT,
  "convertedAt"    TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3)  NOT NULL,

  CONSTRAINT "AdminProspect_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AdminProspect_ownerUserId_fkey"
    FOREIGN KEY ("ownerUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AdminProspect_convertedOrgId_fkey"
    FOREIGN KEY ("convertedOrgId") REFERENCES "Organization"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "AdminProspect_status_idx" ON "AdminProspect"("status");
CREATE INDEX "AdminProspect_email_idx" ON "AdminProspect"("email");
CREATE INDEX "AdminProspect_convertedOrgId_idx" ON "AdminProspect"("convertedOrgId");

CREATE TABLE "ProspectInteraction" (
  "id"          TEXT          PRIMARY KEY,
  "prospectId"  TEXT          NOT NULL,
  "actorUserId" TEXT,
  "type"        TEXT          NOT NULL,
  "subject"     TEXT          NOT NULL,
  "body"        TEXT,
  "occurredAt"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)  NOT NULL,

  CONSTRAINT "ProspectInteraction_prospectId_fkey"
    FOREIGN KEY ("prospectId") REFERENCES "AdminProspect"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProspectInteraction_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ProspectInteraction_prospectId_occurredAt_idx"
  ON "ProspectInteraction"("prospectId", "occurredAt");

CREATE TABLE "ProspectReminder" (
  "id"               TEXT          PRIMARY KEY,
  "prospectId"       TEXT          NOT NULL,
  "createdById"      TEXT,
  "assignedToUserId" TEXT,
  "title"            TEXT          NOT NULL,
  "notes"            TEXT,
  "dueAt"            TIMESTAMP(3)  NOT NULL,
  "completedAt"      TIMESTAMP(3),
  "notifiedAt"       TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3)  NOT NULL,

  CONSTRAINT "ProspectReminder_prospectId_fkey"
    FOREIGN KEY ("prospectId") REFERENCES "AdminProspect"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProspectReminder_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ProspectReminder_assignedToUserId_fkey"
    FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ProspectReminder_completedAt_dueAt_idx"
  ON "ProspectReminder"("completedAt", "dueAt");
CREATE INDEX "ProspectReminder_prospectId_completedAt_idx"
  ON "ProspectReminder"("prospectId", "completedAt");
CREATE INDEX "ProspectReminder_assignedToUserId_completedAt_idx"
  ON "ProspectReminder"("assignedToUserId", "completedAt");
