-- AlterTable
ALTER TABLE "Item" ADD COLUMN "integrationConfig" JSONB;

-- CreateTable
CREATE TABLE "CalendarBlock" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "itemId" TEXT,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarSyncState" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "integrationKey" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "channelId" TEXT,
    "resourceId" TEXT,
    "channelExpiresAt" TIMESTAMP(3),
    "syncToken" TEXT,
    "lastPolledAt" TIMESTAMP(3),
    "lastError" TEXT,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarSyncState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarBlock_source_externalId_key" ON "CalendarBlock"("source", "externalId");

-- CreateIndex
CREATE INDEX "CalendarBlock_organizationId_startAt_idx" ON "CalendarBlock"("organizationId", "startAt");

-- CreateIndex
CREATE INDEX "CalendarBlock_itemId_startAt_idx" ON "CalendarBlock"("itemId", "startAt");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSyncState_channelId_key" ON "CalendarSyncState"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSyncState_organizationId_integrationKey_calendarId_key" ON "CalendarSyncState"("organizationId", "integrationKey", "calendarId");

-- CreateIndex
CREATE INDEX "CalendarSyncState_channelExpiresAt_idx" ON "CalendarSyncState"("channelExpiresAt");

-- AddForeignKey
ALTER TABLE "CalendarBlock" ADD CONSTRAINT "CalendarBlock_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarBlock" ADD CONSTRAINT "CalendarBlock_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSyncState" ADD CONSTRAINT "CalendarSyncState_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
