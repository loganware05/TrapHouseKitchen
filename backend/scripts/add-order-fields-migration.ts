import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Adding missing Order table columns...');

  try {
    // Add orderNumber column if it doesn't exist
    await prisma.$executeRaw`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'Order' AND column_name = 'orderNumber'
        ) THEN
          ALTER TABLE "Order" ADD COLUMN "orderNumber" SERIAL;
          CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNumber_key" ON "Order"("orderNumber");
          CREATE INDEX IF NOT EXISTS "Order_orderNumber_idx" ON "Order"("orderNumber");
        END IF;
      END $$;
    `;

    // Add isArchived column if it doesn't exist
    await prisma.$executeRaw`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'Order' AND column_name = 'isArchived'
        ) THEN
          ALTER TABLE "Order" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
        END IF;
      END $$;
    `;

    // Update existing orders to have orderNumber
    await prisma.$executeRaw`
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
          
          IF counter > 1 THEN
              PERFORM setval('"Order_orderNumber_seq"', (SELECT MAX("orderNumber") FROM "Order"));
          END IF;
      END $$;
    `;

    console.log('✅ Migration completed successfully!');
  } catch (error: any) {
    // If columns already exist, that's okay - don't fail
    if (error.message?.includes('already exists') || error.code === '42701') {
      console.log('ℹ️  Columns already exist, skipping migration');
    } else {
      console.error('❌ Migration failed:', error);
      // Don't throw - let the app start anyway, db push will handle it
    }
  }
}

main()
  .catch((e) => {
    console.error('Migration error (non-fatal):', e);
    // Exit with 0 so the app can still start
    process.exit(0);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
