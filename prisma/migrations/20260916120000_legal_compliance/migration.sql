-- Juridische compliance (audit 2026-09-16): e-mailvoorkeuren, juridische
-- links + widget-instellingen per organisatie, facturatiegegevens, opt-in/
-- opt-out voor review-uitvraag, toestemmingsdatum bij reviews, anonimisering
-- door de retentie-cron en een Invoice-tabel voor abonnementsfacturen.
-- Alleen nieuwe kolommen (nullable of met default) en één nieuwe tabel.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "broadcastEmailOptOutAt" TIMESTAMP(3),
ADD COLUMN     "marketingOptIn" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "billingAddress" TEXT,
ADD COLUMN     "billingCity" TEXT,
ADD COLUMN     "billingCompanyName" TEXT,
ADD COLUMN     "billingCountry" TEXT NOT NULL DEFAULT 'NL',
ADD COLUMN     "billingEmail" TEXT,
ADD COLUMN     "billingPostcode" TEXT,
ADD COLUMN     "billingVatNumber" TEXT,
ADD COLUMN     "privacyUrl" TEXT,
ADD COLUMN     "termsUrl" TEXT,
ADD COLUMN     "widgetAgeCheckEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "widgetPhoneRequired" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "anonymizedAt" TIMESTAMP(3),
ADD COLUMN     "reviewRequestOptOutAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "reviewRequestOptIn" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "consentReceivedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "number" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "netCents" INTEGER NOT NULL,
    "vatCents" INTEGER NOT NULL,
    "grossCents" INTEGER NOT NULL,
    "vatRate" INTEGER NOT NULL DEFAULT 21,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "seller" JSONB NOT NULL,
    "customer" JSONB NOT NULL,
    "paymentId" TEXT NOT NULL,
    "paymentMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_paymentId_key" ON "Invoice"("paymentId");

-- CreateIndex
CREATE INDEX "Invoice_organizationId_issuedAt_idx" ON "Invoice"("organizationId", "issuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_year_sequence_key" ON "Invoice"("year", "sequence");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
