-- CreateEnum
CREATE TYPE "OrgIntegrationStatus" AS ENUM ('INTERESTED', 'REQUESTED', 'ACTIVE', 'PAUSED', 'FAILED');

-- CreateTable
CREATE TABLE "OrgIntegration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "integrationKey" TEXT NOT NULL,
    "status" "OrgIntegrationStatus" NOT NULL DEFAULT 'REQUESTED',
    "monthlyPriceEuro" INTEGER NOT NULL DEFAULT 0,
    "activatedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "config" JSONB,
    "notes" TEXT,
    "supportTicketId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrgIntegration_organizationId_integrationKey_key" ON "OrgIntegration"("organizationId", "integrationKey");

-- CreateIndex
CREATE INDEX "OrgIntegration_organizationId_status_idx" ON "OrgIntegration"("organizationId", "status");

-- CreateIndex
CREATE INDEX "OrgIntegration_status_idx" ON "OrgIntegration"("status");

-- AddForeignKey
ALTER TABLE "OrgIntegration" ADD CONSTRAINT "OrgIntegration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
