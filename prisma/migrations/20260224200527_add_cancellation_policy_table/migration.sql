-- CreateTable
CREATE TABLE "CancellationPolicy" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT,
    "daysBeforeCheckin" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CancellationPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CancellationPolicy_propertyId_key" ON "CancellationPolicy"("propertyId");

-- CreateIndex
CREATE INDEX "CancellationPolicy_propertyId_idx" ON "CancellationPolicy"("propertyId");
