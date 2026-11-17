-- AlterTable
ALTER TABLE "Dish" ADD COLUMN "remainingServings" INTEGER;

-- CreateTable
CREATE TABLE "KitchenOps" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "acceptingOrders" BOOLEAN NOT NULL DEFAULT true,
    "scheduleEnabled" BOOLEAN NOT NULL DEFAULT false,
    "weeklyHours" JSONB,
    "maxConcurrentKitchenOrders" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KitchenOps_pkey" PRIMARY KEY ("id")
);

-- Seed singleton
INSERT INTO "KitchenOps" ("id", "acceptingOrders", "scheduleEnabled", "weeklyHours", "maxConcurrentKitchenOrders", "updatedAt")
VALUES ('default', true, false, NULL, NULL, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
