-- CreateTable
CREATE TABLE "EligibilityAttempt" (
    "id" SERIAL NOT NULL,
    "eligibilityCheckId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "errorMessage" TEXT,
    "retryable" BOOLEAN NOT NULL DEFAULT false,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EligibilityAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EligibilityAttempt_eligibilityCheckId_idx" ON "EligibilityAttempt"("eligibilityCheckId");

-- CreateIndex
CREATE INDEX "EligibilityAttempt_provider_status_idx" ON "EligibilityAttempt"("provider", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EligibilityAttempt_eligibilityCheckId_attemptNumber_key" ON "EligibilityAttempt"("eligibilityCheckId", "attemptNumber");

-- AddForeignKey
ALTER TABLE "EligibilityAttempt" ADD CONSTRAINT "EligibilityAttempt_eligibilityCheckId_fkey" FOREIGN KEY ("eligibilityCheckId") REFERENCES "EligibilityCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
