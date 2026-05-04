-- CreateTable
CREATE TABLE "LeadBlock" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadBlock_organizationId_idx" ON "LeadBlock"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadBlock_organizationId_pattern_key" ON "LeadBlock"("organizationId", "pattern");

-- AddForeignKey
ALTER TABLE "LeadBlock" ADD CONSTRAINT "LeadBlock_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
