-- CreateEnum
CREATE TYPE "PrepTimeSource" AS ENUM ('AUTO', 'CHEF_OVERRIDE');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "prepTimeSource" "PrepTimeSource" NOT NULL DEFAULT 'AUTO';
ALTER TABLE "Order" ADD COLUMN "prepTimeUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PrepTimeObservation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "projectedPrepMinutes" INTEGER NOT NULL,
    "actualPrepMinutes" INTEGER NOT NULL,
    "deltaMinutes" INTEGER NOT NULL,
    "dishIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrepTimeObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrepCalibration" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "globalBiasMinutes" INTEGER NOT NULL DEFAULT 0,
    "sampleCount" INTEGER NOT NULL DEFAULT 0,
    "dishSuggestions" JSONB,
    "lastCalculatedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrepCalibration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrepTimeObservation_orderId_key" ON "PrepTimeObservation"("orderId");

-- CreateIndex
CREATE INDEX "PrepTimeObservation_createdAt_idx" ON "PrepTimeObservation"("createdAt");

-- AddForeignKey
ALTER TABLE "PrepTimeObservation" ADD CONSTRAINT "PrepTimeObservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed singleton calibration row
INSERT INTO "PrepCalibration" ("id", "globalBiasMinutes", "sampleCount", "updatedAt")
VALUES ('singleton', 0, 0, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
