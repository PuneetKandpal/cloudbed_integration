-- Add new EmailType value
ALTER TYPE "EmailType" ADD VALUE IF NOT EXISTS 'ADMIN_CANCELLATION_REQUEST';

-- CreateTable
CREATE TABLE "PropertyNotificationSetting" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT,
    "adminEmails" TEXT[] NOT NULL,
    "supportEmails" TEXT[] NOT NULL,
    "cancelRequestAfterFailures" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyNotificationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyNotificationSetting_propertyId_key" ON "PropertyNotificationSetting"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyNotificationSetting_propertyId_idx" ON "PropertyNotificationSetting"("propertyId");
