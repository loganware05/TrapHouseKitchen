-- Migration script to add dish-based review columns
-- Run this before running the TypeScript migration script

-- Step 1: Add new columns (nullable initially)
ALTER TABLE "Review" 
ADD COLUMN IF NOT EXISTS "dishId" TEXT,
ADD COLUMN IF NOT EXISTS "orderItemId" TEXT,
ADD COLUMN IF NOT EXISTS "dishName" TEXT;

-- Step 2: Add foreign key constraint for dishId (deferrable to allow nulls initially)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'Review_dishId_fkey'
  ) THEN
    ALTER TABLE "Review"
    ADD CONSTRAINT "Review_dishId_fkey" 
    FOREIGN KEY ("dishId") REFERENCES "Dish"(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 3: Remove old unique constraint on orderId
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'Review_orderId_key'
  ) THEN
    ALTER TABLE "Review" DROP CONSTRAINT "Review_orderId_key";
  END IF;
END $$;

-- Step 4: Add new unique constraint on [orderId, dishId]
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'Review_orderId_dishId_key'
  ) THEN
    ALTER TABLE "Review" 
    ADD CONSTRAINT "Review_orderId_dishId_key" UNIQUE ("orderId", "dishId");
  END IF;
END $$;

-- Step 5: Add index on dishId
CREATE INDEX IF NOT EXISTS "Review_dishId_idx" ON "Review"("dishId");

-- Step 6: After running the TypeScript migration script, make dishId and dishName NOT NULL
-- (Uncomment these after migration completes successfully)
-- ALTER TABLE "Review" ALTER COLUMN "dishId" SET NOT NULL;
-- ALTER TABLE "Review" ALTER COLUMN "dishName" SET NOT NULL;
