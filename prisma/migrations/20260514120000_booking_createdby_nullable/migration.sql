-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_createdById_fkey";

-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "createdById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
