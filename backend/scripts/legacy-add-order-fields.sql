-- Legacy manual SQL for Order.orderNumber / isArchived (pre-Prisma-migrate).
-- Baseline migration `20250325120000_init` already includes these columns.
-- Kept for reference only if you need to patch an ancient database by hand.

-- Add orderNumber column with auto-increment sequence
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "orderNumber" SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE INDEX IF NOT EXISTS "Order_orderNumber_idx" ON "Order"("orderNumber");

-- Add isArchived column with default false
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- Update existing orders to have orderNumber (if any exist)
-- This will assign sequential numbers to existing orders
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
    END IF;
END $$;
