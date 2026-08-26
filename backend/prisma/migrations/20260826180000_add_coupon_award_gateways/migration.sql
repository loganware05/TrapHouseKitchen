-- Coupon award gateways (chef-controlled mint sources)
CREATE TABLE IF NOT EXISTS "CouponAwardGateway" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 4.00,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "CouponAwardGateway_pkey" PRIMARY KEY ("key")
);

INSERT INTO "CouponAwardGateway" ("key", "enabled", "discountAmount", "updatedAt")
VALUES ('REVIEW_APPROVE', true, 4.00, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
