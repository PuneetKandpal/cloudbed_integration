-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "guestEmail" TEXT,
ADD COLUMN     "parsedCancellationDeadline" TIMESTAMP(3),
ADD COLUMN     "specialRequests" TEXT;
