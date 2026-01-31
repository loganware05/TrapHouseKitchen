-- SQL Script to add missing Order table columns
-- Run this in Render Shell: psql $DATABASE_URL < backend/scripts/add-order-columns.sql
-- OR copy and paste these commands into Render Shell

-- Add orderNumber column with auto-increment sequence
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Order' AND column_name = 'orderNumber'
  ) THEN
    ALTER TABLE "Order" ADD COLUMN "orderNumber" SERIAL;
    CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNumber_key" ON "Order"("orderNumber");
    CREATE INDEX IF NOT EXISTS "Order_orderNumber_idx" ON "Order"("orderNumber");
    RAISE NOTICE 'Added orderNumber column';
  ELSE
    RAISE NOTICE 'orderNumber column already exists';
  END IF;
END $$;

-- Add isArchived column with default false
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Order' AND column_name = 'isArchived'
  ) THEN
    ALTER TABLE "Order" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
    RAISE NOTICE 'Added isArchived column';
  ELSE
    RAISE NOTICE 'isArchived column already exists';
  END IF;
END $$;

-- Update existing orders to have orderNumber (if any exist)
DO $$
DECLARE
    order_rec RECORD;
    counter INTEGER := 1;
BEGIN
    FOR order_rec IN SELECT id FROM "Order" WHERE "orderNumber" IS NULL ORDER BY "createdAt" ASC
    LOOP
        UPDATE "Order" SET "orderNumber" = counter WHERE id = order_rec.id;
        counter := counter + 1;
    END LOOP;
    
    -- Reset sequence to continue from the highest orderNumber
    IF counter > 1 THEN
        PERFORM setval('"Order_orderNumber_seq"', (SELECT MAX("orderNumber") FROM "Order"));
        RAISE NOTICE 'Updated % existing orders with orderNumbers', counter - 1;
    END IF;
END $$;

SELECT 'Migration completed successfully!' AS status;
