-- CreateEnum
CREATE TYPE "BookingPolicyType" AS ENUM ('FLEXIBLE', 'NON_REFUNDABLE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CREATED', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('PAYMENT_REMINDER', 'PAYMENT_LINK', 'CANCELLATION_WARNING', 'CANCELLATION_CONFIRMATION', 'MANAGER_APPROVAL_REQUEST', 'SUPPORT_NOTIFICATION');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'BOUNCED');

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "propertyName" TEXT,
    "propertyAddress" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancellationDeadline" TIMESTAMP(3),
    "guestId" TEXT,
    "numberOfGuests" INTEGER NOT NULL DEFAULT 1,
    "policyType" "BookingPolicyType" NOT NULL DEFAULT 'UNKNOWN',
    "status" "BookingStatus" NOT NULL DEFAULT 'CREATED',
    "totalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "remainingBalance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "roomId" TEXT,
    "roomName" TEXT,
    "subReservations" JSONB,
    "rawPayload" JSONB NOT NULL,
    "isSameDayCheckIn" BOOLEAN NOT NULL DEFAULT false,
    "requiresManagerApproval" BOOLEAN NOT NULL DEFAULT false,
    "managerApprovedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "cloudbedGuestId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "country" TEXT,
    "city" TEXT,
    "address" TEXT,
    "postalCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rawPayload" JSONB,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "cardLast4" TEXT,
    "cardType" TEXT,
    "transactionId" TEXT,
    "authorizationCode" TEXT,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "gatewayResponse" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAssessment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "isSameDayCheckIn" BOOLEAN NOT NULL DEFAULT false,
    "isNextDayCheckIn" BOOLEAN NOT NULL DEFAULT false,
    "hoursUntilCheckIn" INTEGER,
    "hasMultipleGuests" BOOLEAN NOT NULL DEFAULT false,
    "hasPaymentHistory" BOOLEAN NOT NULL DEFAULT false,
    "hasFailedPayments" BOOLEAN NOT NULL DEFAULT false,
    "propertyOccupancy" DECIMAL(65,30),
    "occupancyThreshold" DECIMAL(65,30) NOT NULL DEFAULT 50,
    "requiresImmediatePayment" BOOLEAN NOT NULL DEFAULT false,
    "priorityForCancellation" BOOLEAN NOT NULL DEFAULT false,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assessmentData" JSONB,

    CONSTRAINT "RiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Email" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "emailType" "EmailType" NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Email_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "bookingId" TEXT,
    "module" TEXT NOT NULL,
    "function" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "inputData" JSONB,
    "outputData" JSONB,
    "errorData" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER,
    "userId" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledTask" (
    "id" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "taskData" JSONB NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduledTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_reservationId_key" ON "Booking"("reservationId");

-- CreateIndex
CREATE INDEX "Booking_reservationId_idx" ON "Booking"("reservationId");

-- CreateIndex
CREATE INDEX "Booking_propertyId_idx" ON "Booking"("propertyId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_startDate_idx" ON "Booking"("startDate");

-- CreateIndex
CREATE INDEX "Booking_createdAt_idx" ON "Booking"("createdAt");

-- CreateIndex
CREATE INDEX "Booking_policyType_idx" ON "Booking"("policyType");

-- CreateIndex
CREATE UNIQUE INDEX "Guest_cloudbedGuestId_key" ON "Guest"("cloudbedGuestId");

-- CreateIndex
CREATE INDEX "Guest_cloudbedGuestId_idx" ON "Guest"("cloudbedGuestId");

-- CreateIndex
CREATE INDEX "Guest_email_idx" ON "Guest"("email");

-- CreateIndex
CREATE INDEX "Guest_propertyId_idx" ON "Guest"("propertyId");

-- CreateIndex
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_nextRetryAt_idx" ON "Payment"("nextRetryAt");

-- CreateIndex
CREATE INDEX "RiskAssessment_bookingId_idx" ON "RiskAssessment"("bookingId");

-- CreateIndex
CREATE INDEX "RiskAssessment_riskLevel_idx" ON "RiskAssessment"("riskLevel");

-- CreateIndex
CREATE INDEX "RiskAssessment_assessedAt_idx" ON "RiskAssessment"("assessedAt");

-- CreateIndex
CREATE INDEX "Email_bookingId_idx" ON "Email"("bookingId");

-- CreateIndex
CREATE INDEX "Email_status_idx" ON "Email"("status");

-- CreateIndex
CREATE INDEX "Email_emailType_idx" ON "Email"("emailType");

-- CreateIndex
CREATE INDEX "Email_nextRetryAt_idx" ON "Email"("nextRetryAt");

-- CreateIndex
CREATE INDEX "AuditLog_requestId_idx" ON "AuditLog"("requestId");

-- CreateIndex
CREATE INDEX "AuditLog_bookingId_idx" ON "AuditLog"("bookingId");

-- CreateIndex
CREATE INDEX "AuditLog_module_idx" ON "AuditLog"("module");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_level_idx" ON "AuditLog"("level");

-- CreateIndex
CREATE INDEX "ScheduledTask_taskType_idx" ON "ScheduledTask"("taskType");

-- CreateIndex
CREATE INDEX "ScheduledTask_scheduledFor_idx" ON "ScheduledTask"("scheduledFor");

-- CreateIndex
CREATE INDEX "ScheduledTask_status_idx" ON "ScheduledTask"("status");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
