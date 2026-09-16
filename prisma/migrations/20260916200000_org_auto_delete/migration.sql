-- Automatisch verwijderen van gestopte organisaties (retentie-cron):
-- moment waarop de eigenaren de waarschuwingsmail kregen. Alleen een
-- nieuwe nullable kolom; geen dataverlies.

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "deletionWarnedAt" TIMESTAMP(3);
