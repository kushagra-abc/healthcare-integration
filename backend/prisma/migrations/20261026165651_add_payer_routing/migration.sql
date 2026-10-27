-- CreateTable
CREATE TABLE "Payer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "payerId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clearinghouse" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clearinghouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayerSupport" (
    "id" SERIAL NOT NULL,
    "payerId" INTEGER NOT NULL,
    "clearinghouseId" INTEGER NOT NULL,
    "eligibilitySupported" BOOLEAN NOT NULL DEFAULT false,
    "claimsSupported" BOOLEAN NOT NULL DEFAULT false,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayerSupport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payer_name_key" ON "Payer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Payer_payerId_key" ON "Payer"("payerId");

-- CreateIndex
CREATE UNIQUE INDEX "Clearinghouse_name_key" ON "Clearinghouse"("name");

-- CreateIndex
CREATE INDEX "PayerSupport_payerId_idx" ON "PayerSupport"("payerId");

-- CreateIndex
CREATE INDEX "PayerSupport_clearinghouseId_idx" ON "PayerSupport"("clearinghouseId");

-- CreateIndex
CREATE UNIQUE INDEX "PayerSupport_payerId_clearinghouseId_key" ON "PayerSupport"("payerId", "clearinghouseId");

-- AddForeignKey
ALTER TABLE "PayerSupport" ADD CONSTRAINT "PayerSupport_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "Payer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayerSupport" ADD CONSTRAINT "PayerSupport_clearinghouseId_fkey" FOREIGN KEY ("clearinghouseId") REFERENCES "Clearinghouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
