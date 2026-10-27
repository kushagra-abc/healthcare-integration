-- CreateEnum
CREATE TYPE "EligibilityStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "EligibilityCheck" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "status" "EligibilityStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'MOCK',
    "normalizedResponse" JSONB,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EligibilityCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EligibilityCheck_patientId_idx" ON "EligibilityCheck"("patientId");

-- CreateIndex
CREATE INDEX "EligibilityCheck_status_idx" ON "EligibilityCheck"("status");

-- AddForeignKey
ALTER TABLE "EligibilityCheck" ADD CONSTRAINT "EligibilityCheck_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
