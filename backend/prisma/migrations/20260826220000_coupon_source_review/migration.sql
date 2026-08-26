-- Link review-approval coupons to the review that triggered them
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "sourceReviewId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Coupon_sourceReviewId_key" ON "Coupon"("sourceReviewId");

ALTER TABLE "Coupon" DROP CONSTRAINT IF EXISTS "Coupon_sourceReviewId_fkey";
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_sourceReviewId_fkey"
  FOREIGN KEY ("sourceReviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;
